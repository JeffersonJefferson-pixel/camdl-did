#!/bin/sh
set -ex
ipfs bootstrap rm all
ipfs bootstrap add "/ip4/$BOOTSTRAP_IP/tcp/4001/ipfs/$BOOTSTRAP_ID"
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://127.0.0.1:3000", "https://webui.ipfs.io", "http://127.0.0.1:5001"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["POST"]'