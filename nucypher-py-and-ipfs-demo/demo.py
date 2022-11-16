"""
 This file is part of nucypher.

 nucypher is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 nucypher is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with nucypher.  If not, see <https://www.gnu.org/licenses/>.
"""


import datetime
import maya
import os
import sys
from pathlib import Path
import base64

from nucypher.characters.lawful import Alice, Bob, Ursula
from nucypher.characters.lawful import Enrico as Enrico
from nucypher.config.constants import TEMPORARY_DOMAIN
from nucypher.crypto.powers import SigningPower, DecryptingPower
from nucypher.utilities.logging import GlobalLoggerSettings
from nucypher_core import MessageKit

import ipfshttpclient


######################
# Boring setup stuff #
######################

BOOK_PATH = Path('hello-world.txt')

# Twisted Logger
GlobalLoggerSettings.set_log_level(log_level_name='info')
GlobalLoggerSettings.start_console_logging()

# if your ursulas are NOT running on your current host,
# run like this: python finnegans-wake-demo.py 172.28.1.3:11500
# otherwise the default will be fine.

try:
    SEEDNODE_URI = sys.argv[1]
except IndexError:
    SEEDNODE_URI = "localhost:11500"

##############################################
# Ursula, the Untrusted Re-Encryption Proxy  #
##############################################
ursula = Ursula.from_seed_and_stake_info(seed_uri=SEEDNODE_URI, federated_only=True)

# Here are our Policy details.
policy_end_datetime = maya.now() + datetime.timedelta(days=1)
threshold, shares = 2, 3
label = b"secret/files/and/stuff"

client = ipfshttpclient.connect()


#####################
# Bob the BUIDLer  ##
#####################

# First there was Bob.
bob = Bob(federated_only=True, domain=TEMPORARY_DOMAIN, known_nodes=[ursula])

# Bob gives his public keys to alice.
verifying_key = bob.public_keys(SigningPower)
encrypting_key = bob.public_keys(DecryptingPower)

######################################
# Alice, the Authority of the Policy #
######################################

alice = Alice(federated_only=True, domain=TEMPORARY_DOMAIN, known_nodes=[ursula])


# Start node discovery and wait until 8 nodes are known in case
# the fleet isn't fully spun up yet, as sometimes happens on CI.
alice.start_learning_loop(now=True)
alice.block_until_number_of_known_nodes_is(8, timeout=30, learn_on_this_thread=True)

# Alice can get the public key even before creating the policy.
# From this moment on, any Data Source that knows the public key
# can encrypt data originally intended for Alice, but that can be shared with
# any Bob that Alice grants access.
policy_public_key = alice.get_policy_encrypting_key_from_label(label)

# Alice grant access to Bob. She already knows Bob's public keys from a side-channel.
remote_bob = Bob.from_public_keys(encrypting_key=encrypting_key, verifying_key=verifying_key)
policy = alice.grant(remote_bob, label, threshold=threshold, shares=shares, expiration=policy_end_datetime)

assert policy.public_key == policy_public_key

# Alice puts her public key somewhere for Bob to find later...
alice_verifying_key = alice.stamp.as_umbral_pubkey()

# ...and then disappears from the internet.
#
# Note that local characters (alice and bob), as opposed to objects representing
# remote characters constructed from public data (remote_alice and remote_bob)
# run a learning loop in a background thread and need to be stopped explicitly.
alice.disenchant()
del alice

#####################
# some time passes. #
# ...               #
#                   #
# ...               #
# And now for Bob.  #
#####################

#####################
# Bob the BUIDLer  ##
#####################

# Now let's show how Enrico the Encryptor
# can share data with the members of this Policy and then how Bob retrieves it.
# In order to avoid re-encrypting the entire book in this demo, we only read some lines.
with open(BOOK_PATH, 'rb') as file:
    # convert file to byte array
    file_base64 = base64.b64encode(file.read())

print(f"\nfile base64: {file_base64}\n")


#########################
# Enrico, the Encryptor #
#########################

enrico = Enrico(policy_encrypting_key=policy_public_key)

# encrypt file
message_kit = enrico.encrypt_message(file_base64)

data_source_public_key = enrico.stamp.as_umbral_pubkey()
del enrico

# convert message_kit to base64
message_kit_base64 = base64.b64encode(bytes(message_kit)).decode()

with open("message_kit", "w") as out_file:
    out_file.write(message_kit_base64)

#  uploads message kit file to ipfs
cid = client.add("message_kit")['Hash']

###############
# Back to Bob #
###############

# bob fetches message kit from ipfs
message_kit_from_ipfs = client.cat(cid)
message_kit_from_ipfs = MessageKit.from_bytes(base64.b64decode(message_kit_from_ipfs))

# Now Bob can retrieve the original message.
decrypted_file_base64 = bob.retrieve_and_decrypt([message_kit_from_ipfs],
                                                alice_verifying_key=alice_verifying_key,
                                                encrypted_treasure_map=policy.treasure_map)[0]

# We show that indeed this is the passage originally encrypted by Enrico.
print(f"\ndecrypted file base64: {decrypted_file_base64}\n")
assert file_base64 == decrypted_file_base64

# save decrypted data
with open("retrieved-file.txt", "wb") as fh:
    fh.write(base64.b64decode(decrypted_file_base64))


bob.disenchant()
