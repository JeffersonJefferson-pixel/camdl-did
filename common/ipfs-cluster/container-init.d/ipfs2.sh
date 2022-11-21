#!/bin/sh
set -ex
ipfs bootstrap rm all
ipfs bootstrap add "/ip4/$BOOTSTRAP_IP/tcp/4001/ipfs/$BOOTSTRAP_ID"