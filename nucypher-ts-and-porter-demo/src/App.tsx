import { Alice, Bob, EnactedPolicy, SecretKey, Enrico, MessageKit, RemoteBob, BlockchainPolicyParameters } from '@nucypher/nucypher-ts';
import { ethers } from 'ethers';
import React from 'react';
import { useEffect, useState } from 'react';
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { fromBase64, toBase64, toHexString } from './utils';

declare let window: any;

export function App() {
  const [retrievedFileUrl, setRetrievedFileUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
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
    const file = e.target.files[0];
    setOriginalFile(file);
    let blob = URL.createObjectURL(file);
    setOriginalFileUrl(blob);
  }

  // const getFileBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  //   const reader = new FileReader();
  //   reader.readAsDataURL(file);
  //   reader.onload = () => resolve(reader.result!.toString().replace(/^data:(.*,)?/, ''));
  //   reader.onerror = error => reject(error);
  // });

  let uploadMessageKitToIPFS = async () => {
    // need file and policy
    if (!originalFile || !policy) return;
    // convert file to uint8 array
    // let fileBase64: string = await getFileBase64(originalFile);
    let buffer = await originalFile.arrayBuffer();
    let fileBytes = new Uint8Array(buffer);
    // console.log(`file base64 ${fileBase64}`);
    // console.log("file uint8Array ", fromBase64(fileBase64));

    let enrico = new Enrico(policy.policyKey);
    const encryptedMessageKit: MessageKit = enrico.encryptMessage(fileBytes);
        
    const data = toBase64(encryptedMessageKit.toBytes())
    console.log("Generated encrypted message kit: ", data);

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

    // cat chuck from ipfs
    for await (const chuck of ipfsClient.cat(encryptedMessageKitCid)) {
      chunks.push(chuck);
    }

    // retrieve messagekit base64
    let encryptedMessageKit: string = Buffer.concat(chunks).toString();
    console.log("Retrieved encrypted message kit:", encryptedMessageKit);
    
    // convert to object 
    let encryptedMessageKitObj: MessageKit = MessageKit.fromBytes(fromBase64(encryptedMessageKit));

    const res = (await bob.retrieveAndDecrypt(
        policy.policyKey,
        alice.verifyingKey,
        [encryptedMessageKitObj],
        policy.encryptedTreasureMap,
    ))[0];
    
    const resBase64 = toBase64(res);
    console.log(`res base64 ${resBase64}`);
    
    let retrievedFileBlob = new Blob([res], { type: 'image/png' });

    let retrievedFileUrl  =  URL.createObjectURL(retrievedFileBlob);

    setRetrievedFileUrl(retrievedFileUrl)
  }

  const config = {
    // Public Porter endpoint
    porterUri: 'https://porter-tapir.nucypher.community',
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
    return RemoteBob.fromKeys(decryptingKey, verifyingKey);
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

    const policyParams: BlockchainPolicyParameters = {
      bob: remoteBob,
      label: getRandomLabel(),
      threshold: 2,
      shares: 3,
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };
    
    const policy = await alice.grant(policyParams, [], []);

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
              <div>Policy created</div>
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
