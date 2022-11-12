import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

const Home = () => {
  // walletConnected keeps track if wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  // presaleStarted keeps track if presale has started
  const [presaleStarted, setPresaleStarted] = useState(false);

  // presaleEnded keeps track if presale has ended
  const [presaleEnded, setPresaleEnded] = useState(false);

  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);

  // check if currently connected metamask wallet is the owner of the contract
  const [isOwner, setIsOwner] = useState(false);

  // tokenIdsMinted keeps track of the number of tokenIds that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");

  // create a reference to the web3 modal (used for connecting to metamask) which is active as long as page is open
  const web3ModalRef = useRef();

  // presaleMint - mint an nft during the presale;
  const presaleMint = async () => {
    try {
      // we need a Signer because this is a 'write' transaction
      const signer = await getProviderOrSigner(true);

      // create new instance of contract with a Signer, which allows update methods
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      // call the presaleMint from the contract, only whitelisted addresses would be able to mint
      const tx = await nftContract.presaleMint({
        // value is the cost of one crypto dev which is '0.01' eth
        // we are parsing '0.01' string to ether using utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);

      // wait for transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };

  // publicMint - mint an nft after presale
  const publicMint = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      const tx = await nftContract.mint({
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("You have successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };

  // connectWallet - connects metamask wallet
  const connectWallet = async () => {
    try {
      // get provider from web3modal, this case metamask, prompting user to connect wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // startPresale - starts presale for the NFT collection
  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      const tx = await nftContract.startPresale();
      setLoading(true);
      await tx.wait();
      setLoading(false);

      // set presale started to true
      await checkIfPresaleStarted();
    } catch (err) {
      console.error(err);
    }
  };

  // checkIfPresaleStarted - checks if presale has started by querying 'presaleStarted' variable in contract
  const checkIfPresaleStarted = async () => {
    try {
      // get provider from web3modal (in this case metamask)
      // read only from state, so no need for Signer
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      // call presaleStarted from contract
      const _presaleStarted = await nftContract.presaleStarted();
      if (!presaleStarted) {
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // checkIfPresaleEnded - checks if presale has ended by querying 'presaleEnded' variable in contract
  const checkIfPresaleEnded = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      // call presaleEnded from contract
      const _presaleEnded = await nftContract.presaleEnded();

      // _presaleEnded is a Big Number, so we use lt(less than function) instead of '<'
      // Date.now()/1000 returns current time in seconds, which we compare with _presaleEnded timestamp
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }
      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // getOwner - calls contract to retrieve owner
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      // call owner function from contract
      const _owner = await nftContract.owner();

      // get the signer now to extract address of currently connected metamask account
      const signer = await getProviderOrSigner(true);

      // get the address associated to the signer connected to metamask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
        console.log(address);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  // getTokenIdsMinted - gets the number of tokenIds that have been minted
  const getTokenIdsMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      // call tokenIds from the contract
      const _tokenIds = await nftContract.tokenIds();

      // _tokenIds is a Big Number, we convert the number to a string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  /*
  Returns a Provider or Signer object representing the Ethereum RPC with or without the signing capabilities of metamask attached
  A 'Provider' is needed to interact with the blockchain - reading transactions/balances/state etc
  A 'Signer' is a special type of Provider used in case a 'write' transaction needs to be made to the blockchain, which involves the connected account needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow the website to request signatures from the user using Signer functions
  
  needSigner = true if you need signer, by default it is set to false
  */

  const getProviderOrSigner = async (needSigner = false) => {
    // connect to metamask and access 'current' value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // if user is not connected to goerli network, throw error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Change network to Goerli");
      throw new Error("Change network to Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  useEffect(() => {
    // if wallet is not connected, create new instance of web3modal and connect metamask wallet
    if (!walletConnected) {
      // assign web3modal class to the reference object by setting 'current' value which persists as long as page is open
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      // check if presale has started/ended
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // set interval to get number of token Ids minted every 5 seconds
      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  // renderButton - return button based on dapp state

  const renderButton = () => {
    // if wallet is not connected, return button which allows user to connect
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // if waiting for something, return loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // if connected user is the owner, and presale hasn't started yet, allow user to start presale
    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // if connected user is not owner and presale has not started, let them know
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale has not started yet!</div>
        </div>
      );
    }

    // if presale started but has not ended yet, allow for minting during presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started! If your address is whitelisted, mint a Crypto
            Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // if presale started and has ended, time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs</h1>
          <div className={styles.description}>
            It's an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
};

export default Home;
