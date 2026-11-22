// tiny-stack-vm: a faithful port of the kit's reference VM (generator/subject/vm.mjs). One step in its
// order: step limit, pc bound, opcode, immediate fits, steps++, stack needs, the op's own traps, its
// effect. Every trap exits with its code; output written before it stays. No dependencies.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const SM = 256, CM = 64, MM = 256, LIM = 1e6, OM = 65536;
const D = new Int32Array(SM), C = new Int32Array(CM), M = new Int32Array(MM), OUT = new Uint8Array(OM);
const ENC = new TextEncoder();
// opcode -> immediate bytes; 255 marks a byte no opcode names (vm.mjs's OP_BY_BYTE miss)
const IMM = new Uint8Array(256).fill(255);
const POP = new Uint8Array(256), PUSH = new Uint8Array(256);
for (let o = 0; o < 256; o++) {
  if (o < 8 || (o > 15 && o < 35 && o !== 31) || (o > 47 && o < 53) || o === 64 || o === 65 || (o > 79 && o < 84))
    IMM[o] = o === 1 ? 1 : o === 2 ? 4 : o > 47 && o < 52 ? 2 : 0;
}
for (const [o, p, q] of [[1, 0, 1], [2, 0, 1], [3, 1, 0], [4, 1, 2], [5, 2, 2], [6, 2, 3], [7, 3, 3], [0x17, 1, 1], [0x1b, 1, 1], [0x31, 1, 0], [0x32, 1, 0], [0x40, 1, 1], [0x41, 2, 0], [0x50, 1, 0], [0x51, 1, 0], [0x52, 0, 1], [0x53, 1, 0]]) {
  POP[o] = p;
  PUSH[o] = q;
}
for (let o = 0x10; o <= 0x22; o++) if (o !== 0x17 && o !== 0x1b) { POP[o] = 2; PUSH[o] = 1; }

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const n = p.length;
  M.fill(0);
  let sp = 0, cp = 0, ol = 0, ip = 0, pc = 0, st = 0;
  const T = (code: number) => ({ out: OUT.slice(0, ol), code });
  for (;;) {
    if (st === LIM) return T(10);
    if (pc < 0 || pc >= n) return T(9);
    const op = p[pc], im = IMM[op];
    if (im === 255) return T(5);
    if (pc + im >= n) return T(9);
    st++;
    const nx = pc + im + 1;
    pc = nx;
    if (sp < POP[op]) return T(2);
    if (sp - POP[op] + PUSH[op] > SM) return T(3);
    if (op >= 0x10 && op <= 0x22 && op !== 0x17 && op !== 0x1b) {
      const b = D[sp - 1], a = D[sp - 2];
      let r: number;
      switch (op) {
        case 0x10: r = a + b | 0; break;
        case 0x11: r = a - b | 0; break;
        case 0x12: r = Math.imul(a, b); break;
        case 0x13: if (b === 0) return T(4); r = a === -2147483648 && b === -1 ? a : a / b | 0; break;
        case 0x14: if (b === 0) return T(4); r = b === -1 ? 0 : a % b | 0; break;
        case 0x15: if (b === 0) return T(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
        case 0x16: if (b === 0) return T(4); r = (a >>> 0) % (b >>> 0) | 0; break;
        case 0x18: r = a & b; break;
        case 0x19: r = a | b; break;
        case 0x1a: r = a ^ b; break;
        case 0x1c: r = a << (b & 31); break;
        case 0x1d: r = a >> (b & 31); break;
        case 0x1e: r = a >>> (b & 31) | 0; break;
        case 0x20: r = a === b ? 1 : 0; break;
        case 0x21: r = a < b ? 1 : 0; break;
        default: r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      }
      sp -= 2;
      D[sp++] = r;
      continue;
    }
    switch (op) {
      case 0x00: return T(0);
      case 0x01: D[sp++] = (p[nx - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = p[nx - 4] | p[nx - 3] << 8 | p[nx - 2] << 16 | p[nx - 1] << 24; break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x30: case 0x31: case 0x32: {
        let take = true;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = nx + ((p[nx - 2] | p[nx - 1] << 8) << 16 >> 16);
        break;
      }
      case 0x33: if (cp === CM) return T(7); C[cp++] = nx; pc = p[nx - 2] | p[nx - 1] << 8; break;
      case 0x34: if (cp === 0) return T(8); pc = C[--cp]; break;
      case 0x40: { const a = D[sp - 1]; if (a < 0 || a >= MM) return T(6); D[sp - 1] = M[a]; break; }
      case 0x41: { const a = D[sp - 1], v = D[sp - 2]; if (a < 0 || a >= MM) return T(6); sp -= 2; M[a] = v; break; }
      case 0x50: { const b = ENC.encode(String(D[sp - 1])); if (ol + b.length > OM) return T(11); sp--; OUT.set(b, ol); ol += b.length; break; }
      case 0x51: if (ol === OM) return T(11); OUT[ol++] = D[--sp] & 255; break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      default: return T(D[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(`${I}/${id}/program.bin`)), new Uint8Array(readFileSync(`${I}/${id}/input.bin`)));
  mkdirSync(`${O}/${id}`, { recursive: true });
  writeFileSync(`${O}/${id}/stdout.bin`, r.out);
  writeFileSync(`${O}/${id}/exit.txt`, `${r.code}\n`);
}
