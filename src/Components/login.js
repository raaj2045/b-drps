import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import './login.css'

// Landing / wallet-connect page.
// Identity is derived from MetaMask's active account in App.js
// (see the auto-detect useEffect). This page just gates the entry:
//   - If userLoggedIn -> redirect to /profile
//   - Else -> show Connect Wallet button (triggers MetaMask permission prompt)
//             plus a Sign up link for unregistered active accounts.
function Login(props) {
  const { userLoggedIn, loginUserAddress } = props;
  const navigate = useNavigate();

  useEffect(() => {
    if (userLoggedIn) {
      navigate("/profile");
    }
  }, [userLoggedIn, navigate]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Install MetaMask to use this dapp.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      // App.js's accountsChanged handler picks up the active account and either
      // auto-logs in (registered) or leaves the user here to click Sign up.
    } catch (e) {
      alert("MetaMask connection rejected.");
    }
  };

  const hasActiveAccount = Boolean(loginUserAddress);

  return (
    <div className="loginpage">
      <div>
        <h1><strong>The Research Paper Publishing System</strong></h1>
        <hr></hr>
      </div>
      <div className="container w-25 mb-5">
        <h2 className="mt-0 mb-3 text-center"><strong>Connect Wallet</strong></h2>
        <div className="mb-3"></div>

        {!hasActiveAccount && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={connectWallet}
            >
              <strong>CONNECT METAMASK</strong>
            </button>
            <p className="mt-2">
              <strong>Not registered? </strong>
              <Link to="/signup"><strong>Sign up</strong></Link>
            </p>
          </>
        )}

        {hasActiveAccount && !userLoggedIn && (
          <>
            <p className="mt-2">
              <strong>Active account:</strong> <code>{loginUserAddress}</code>
            </p>
            <p className="mt-2">
              This address is not registered yet.{" "}
              <Link to="/signup"><strong>Sign up</strong></Link> to request access.
            </p>
          </>
        )}
      </div>
      <Link to="/PublishedPapers">
        <button
          type="button"
          className="btn btn-primary"
        >
          Published Papers By Our JOURNAL
        </button>
      </Link>
      <br></br>
      <Link to="/developerspace">
        <button
          className="btn btn-primary"
        >
          Developer's Information
        </button>
      </Link>
      <br></br>

      {/* for books animation */}
      <div className="shelf">
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>

        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
        <div className="book"></div>
      </div>
    </div>
  );
}

export default Login;
