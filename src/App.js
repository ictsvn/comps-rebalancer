import NodeWalletConnect from "@walletconnect/node";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";

import './App.css';

const Eth = require('web3-eth');

const { contractAddress, rpcEndpoint, chainId } = require("./configs").default.main;
const abi = require("./abi.json");
const generateConnector = () => new NodeWalletConnect(
  {
    bridge: "https://bridge.walletconnect.org", // Required
  },
  {
    clientMeta: {
      description: "WalletConnect NodeJS Client",
      url: "https://nodejs.org/en/",
      icons: ["https://nodejs.org/static/images/logo.svg"],
      name: "ReBalancer",
    },
  }
);

function App() {
  const [connector, setConnector] = useState(undefined);
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const inputRef = useRef();

  const init = useCallback(() => {
    const connector = generateConnector();
    connector.on("connect", (error, payload) => {
      window.alert(`connected: ${JSON.stringify(error || payload)}`);
      if (error) {
        throw error;
      }

      // Close QR Code Modal
      WalletConnectQRCodeModal.close(true);

      // Get provided accounts and chainId
      const { accounts } = payload.params[0];
      setAccounts(accounts);
      setConnected(true);
    });

    connector.on("session_update", (error, payload) => {
      window.alert(`session_update: ${JSON.stringify(error || payload)}`);
    });

    connector.on("disconnect", (error, payload) => {
      window.alert(`disconnect: ${JSON.stringify(error || payload)}`);
      if (error) {
        throw error;
      }

      setConnected(false);
    });

    setConnector(connector);
    if (connector.connected) {
      setConnected(true);
      setAccounts(connector.accounts);
      window.alert(connector.accounts);
    }
  }, []);

  const onToggleConnection = useCallback(() => {
    if (!connector) {
      return;
    }
    if (!connector.connected) {
      // create new session
      connector.createSession({ chainId }).then(() => {
        // get uri for QR Code modal
        const uri = connector.uri;
        // display QR Code modal
        WalletConnectQRCodeModal.open(
          uri,
          () => {
            console.log("QR Code Modal closed");
          },
          true // isNode = true
        );
      });
    } else {
      connector.killSession();
    }
  }, [connector])

  const testContract = useCallback(async () => {
    try {
      const eth = new Eth(rpcEndpoint);
      const nonce = await eth.getTransactionCount(accounts[0]);
      const iface = new ethers.utils.Interface(abi);
      const data = iface.encodeFunctionData("setNumber", [inputRef.current.value]);
      const tx = {
        from: accounts[0],
        to: contractAddress,
        data,
        gasPrice: ethers.utils.hexValue(5000000000),
        gas: ethers.utils.hexValue(80000),
        nonce: ethers.utils.hexValue(nonce),
      }
      await connector.sendTransaction(tx);
    } catch (err) {
      window.alert(err);
    }
  }, [connector, accounts])

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="App">
      <button className="button" onClick={onToggleConnection}>{connector ? connected ? 'Disconnect' : 'Connect' : 'Loading...'}</button>
      {connected && (
        <>
          <input ref={inputRef} type="text" defaultValue={"123"} />
          <button onClick={testContract}>Set value</button>
        </>
      )}
    </div>
  );
}

export default App;
