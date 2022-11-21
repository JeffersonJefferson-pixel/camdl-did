### Instruction

1. Pre-requisites

  1. Install brownie

  2. add a dev network to brownie

    brownie networks add Development ganache-local host=http://127.0.0.1:8545 cmd=ganache

  3. add account by importing private key

    brownie account add ganache1

2. Run `brownie console --network ganache-local` 

3. Run `brownie run scripts/deploy_subscription_manager.py main ganache1 --network ganache-local`