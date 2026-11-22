[![make.fun](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/andsfx/tiny-stack-vm/rank.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/andsfx/tiny-stack-vm/reward.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122)

# tiny-stack-vm

Entry for [Build a tiny stack virtual machine, 22 November 2026](https://make.fun/c/tiny-stack-vm-01-run-20261122) on make.fun.

`main.ts` is a faithful interpreter of make.fun's tiny stack ISA: 32-bit wrapping integers, a 256-value data stack, a 64-deep call stack, 256 memory words, input and output streams, and the ten traps with their own exit codes. It answers all 40 practice instances byte for byte.

## Result

All 40 practice instances match the reference VM's output and exit code: score 1,000,000 of 1,000,000, answered 40, passed 1. The whole set runs in well under a second, and two separate runs produce identical files.
