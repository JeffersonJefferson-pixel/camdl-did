import { Alice, Bob, EnactedPolicy, SecretKey, Enrico, MessageKit } from '@nucypher/nucypher-ts';
import { ethers } from 'ethers';
import React from 'react';
import { useEffect, useState } from 'react';
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { fromHexString, toBytes } from './utils';

declare let window: any;

const gatewayUrl = process.env.GATEWAY_URL

function toHexString(byteArray: Uint8Array) {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
}

export function App() {
  const [retrievedFileUrl, setRetrievedFileUrl] = useState<string | null>(null);
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);
  const [encryptedMessageKitCid, setEncryptedMessageKitCid] = useState<string | null>(null);
  const [provider, setProvider] = useState(undefined as ethers.providers.Web3Provider | undefined);
  const [alice, setAlice] = useState(undefined as Alice | undefined);
  const [bob, setBob] = useState(undefined as Bob | undefined);
  const [policy, setPolicy] = useState(undefined as EnactedPolicy | undefined);
  
  let ipfsClient: IPFSHTTPClient = create({ url: "http://localhost:5001"});


  const loadWeb3Provider = async () => {
    if (!window.ethereum) {
      console.error('You need to connect to the MetaMask extension');
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

    const { chainId } = await provider.getNetwork();
    if (![137, 80001].includes(chainId)) {
      console.error('You need to connect to the Goerli test network');
    }

    await provider.send('eth_requestAccounts', []);
    setProvider(provider);
  };

  let onChange = async (e: any) =>{
    // preview
    const file = e.target.files[0]
    let blob = URL.createObjectURL(file)
    setOriginalFileUrl(blob)
  }

  let uploadMessageKitToIPFS = async () => {
    console.log("gateway url: ", gatewayUrl)
    // need file and policy
    if (!originalFileUrl || !policy) return
    // turn blob back to file
    let file = new File([originalFileUrl], "file");
    let fileBase64: string | null = null;
    // get file base64
    const reader = new FileReader();
    reader.onloadend = () => {
        console.log(reader.result);
        fileBase64 = reader.result as string;
        
    };
    reader.readAsDataURL(file);

    let enrico = new Enrico(policy.policyKey)
    const encryptedMessageKit = enrico.encryptMessage(toBytes(fileBase64!));
        
    // encrypt
    const data = JSON.stringify({
      path: "message_kit",
      content: encryptedMessageKit
    })

    try {
      const res = await ipfsClient.add(data);
      // const url = `https://${gatewayUrl}/ipfs/${added.path}`;
      /* after metadata is uploaded to IPFS, return the URL to use it in the transaction */
      setEncryptedMessageKitCid(res.cid.toString());
    } catch (error) {
      console.log('Error uploading encrypted message kit: ', error)
    }  
  }

  let retrieveFile = async () => {
    if (!encryptedMessageKitCid || !bob || !alice || !policy) return;
    const chunks = [];
    for await (const chuck of ipfsClient.cat(encryptedMessageKitCid)) {
      chunks.push(chuck);
    }

    let encryptedMessageKit = chunks.toString();
    console.log("Retrieved file contents:", encryptedMessageKit);
    // convert to object 
    let encryptedMessageKitObj = MessageKit.fromBytes(fromHexString(encryptedMessageKit));
    

    const retrievedFile = await bob.retrieveAndDecrypt(
        policy!.policyKey,
        alice.verifyingKey,
        [encryptedMessageKitObj],
        policy.encryptedTreasureMap,
    );
    
    let retrievedFileBlob = new Blob(retrievedFile);
    let retrievedFileUrl  =  URL.createObjectURL(retrievedFileBlob)
    setRetrievedFileUrl(retrievedFileUrl)

  }

  const config = {
    // Public Porter endpoint on Ibex network
    porterUri: 'http://127.0.0.1:80',
  }

  const makeAlice = () => {
    if (!provider) {
      return;
    }
    const secretKey = SecretKey.fromBytes(Buffer.from('fake-secret-key-32-bytes-alice-x'));
    const alice = Alice.fromSecretKey(config, secretKey, provider);
    setAlice(alice);
  };

  const makeBob = () => {
    const secretKey = SecretKey.fromBytes(Buffer.from('fake-secret-key-32-bytes-bob-xxx'));
    const bob = Bob.fromSecretKey(config, secretKey);
    setBob(bob);
  };

  const makeRemoteBob = (bob: Bob) => {
    const { decryptingKey, verifyingKey } = bob;
    return { decryptingKey, verifyingKey };
  };

  const makeCharacters = () => {
    makeAlice();
    makeBob();
    setPolicy(undefined);
  };

  const getRandomLabel = () => `label-${new Date().getTime()}`;

  const runExample = async () => {
    if (!alice || !bob) {
      return;
    }
    const remoteBob = makeRemoteBob(bob);
    const threshold = 2;
    const shares = 3;
    const startDate = new Date();
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // In 30 days
    const policyParams = {
      bob: remoteBob,
      label: getRandomLabel(),
      threshold,
      shares,
      startDate,
      endDate,
    };

    const policy = await alice.grant(
      policyParams,
      [],
      []
    );

    console.log('Policy created');
    setPolicy(policy);
  };

  useEffect(() => {
    loadWeb3Provider();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <div className="stack left">
          <div>
            <div>Create Alice and Bob</div>
            <button onClick={(e) => makeCharacters()}>Go</button>
            <div>
              {alice && (
                <span>
                  Alice: {`0x${toHexString(alice.verifyingKey.toBytes())}`}
                </span>
              )}
            </div>
            <div>
              {bob && (
                <span>
                  Bob: {`0x${toHexString(bob.verifyingKey.toBytes())}`}
                </span>
              )}
            </div>
          </div>

          {alice && bob && (
            <div>
              <div>Create a policy</div>
              <button onClick={(e) => runExample()}>Go</button>
            </div>
          )}

          {policy && (
            <>
              <input
                type="file"
                name="Asset"
                onChange={onChange}
              />
              <button onClick={uploadMessageKitToIPFS}>
                Upload Message Kit
              </button>
            </>
          )}

          {originalFileUrl && (
            <div>
              <div> Original File </div>
              <img width="350" src={originalFileUrl} />
            </div>
          )}

          {encryptedMessageKitCid && (
            <div>
             <div>Retrieve File</div>
             <button onClick={(e) => retrieveFile()}>Go</button>
           </div>
          )}

          {retrievedFileUrl && (
            <div>
              <div> Retrieved File </div>
              <img width="350" src={retrievedFileUrl} />
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
