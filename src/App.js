
// Importing All the Components and neccessary packages

import './App.css';
import Web3 from "web3";
import { Web3Storage } from 'web3.storage';
import { useState, useEffect } from "react";
import Auth from "./contract_abi/Auth.json";
import Main from "./contract_abi/Main.json";
import Decision from "./contract_abi/Decision.json";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Components/login"
import Signup from "./Components/signup"
import Profile from "./Components/Profile"
import Authorpaper from './Components/authorpaper';
import ReceivedbyEICpage from './Components/recievedbyEIC';
import ApprovedbyEICpage from './Components/approveedbyEIC';
import ReceivedbyAEpage from './Components/receivedbyAE';
import ApprovedbyAEpage from './Components/approvedbyAE';
import ReceivedbyReviewerpage from './Components/receivedByReviewer';
import ReviewedbyReviewerpage from './Components/reviewedbyReviewer';
import ReturnToAEpage from './Components/returntoAE';
import ReviewedbyAEpage from './Components/reviewedbyAE';
import ReturntoEICpage from './Components/ReturnToEIC';
import Publishpaperpage from './Components/publishedpapers';
import ReturnToAuthorpage from './Components/returnPaper';
import Developerspace from './Components/developerspace';

// Main App Component
function App() {

  // States for Storing All contract Addresses  
  const [authcontractaddress, setAuthContractAddress] = useState(null);
  const [maincontractaddress, setMainContractAddress] = useState(null);
  const [decisioncontractaddress, setDecisionContractAddress] = useState(null);

  // Connection of Smart Contracts usinf Web3 and Metamask connection Checking for login
  // State for check smart contract is connected or not also frontend is doing conversion with smart contract or not
  const [state, setState] = useState({ web3: null, authcontract: null, maincontract: null, decisioncontract: null });
  // useEffect is for calling smart contracts when state change and component render
  useEffect(() => {
    const provider = new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545")
    async function template() {
      const web3 = new Web3(provider);
      console.log(web3);
      // Connection of Auth Contract
      const authnetworkId = await web3.eth.net.getId();
      const authdeployedNetwork = Auth.networks[authnetworkId];
      setAuthContractAddress(authdeployedNetwork.address);
      const authcontract = new web3.eth.Contract(Auth.abi, authdeployedNetwork.address);
      // Connection of main Contract
      const mainnetworkId = await web3.eth.net.getId();
      const maindeployedNetwork = Main.networks[mainnetworkId];
      setMainContractAddress(maindeployedNetwork.address);
      const maincontract = new web3.eth.Contract(Main.abi, maindeployedNetwork.address);
      // Connection of Decision Contract
      const decisionnetworkId = await web3.eth.net.getId();
      const decisiondeployedNetwork = Decision.networks[decisionnetworkId];
      setDecisionContractAddress(decisiondeployedNetwork.address);
      const decisioncontract = new web3.eth.Contract(Decision.abi, decisiondeployedNetwork.address);
      // set state for set all smart contracts
      setState({ web3: web3, authcontract: authcontract, maincontract: maincontract, decisioncontract: decisioncontract })
    }
    provider && template();
  }, []);
  console.log(state)



  // Auth Contract -----------------------------------------------------------------------------------------------------------------------
  // Handle Changes in Members information
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name != "userAddress") {
      let capitalizedValue = value;
      setMemberInfo({
        ...memberInfo,
        [name]: capitalizedValue,
      });
    } else {
      setMemberInfo({
        ...memberInfo,
        [name]: value,
      });
    }
  };

  // State for manage member's info
  const [memberInfo, setMemberInfo] = useState({
    name: "",
    role: "",
    email: "",
    useraddress: "",
  });

  // Request user function for sign up and request to login
  async function requestUser(name, role, email, useraddress) {
    // Checking metamask is connected or not
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      const { authcontract } = state;
      const requestUser = await authcontract.methods
        .addOrRequestMember(
          memberInfo.name,
          memberInfo.role,
          memberInfo.email,
          memberInfo.useraddress,
          true
        )
        .send({ from: accounts[0], gas: 2000000 });
      setMemberInfo({ name: "", role: "", email: "", useraddress: "" });
      alert('Signup Successfully !!')
    } catch (error) {
      alert(error.message);
    }
  }

  // States for Requested Member's array anf Approved Member's Array 
  const [requestedMembersArray, setRequestedMembersArray] = useState([]);
  const [showApproovedMemberInfo, setShowApproovedMemberInfo] = useState(false);
  const [showRequestedMemberInfo, setShowRequestedMemberInfo] = useState(false);
  const [approovedMembersArray, setApproovedMembersArray] = useState([]);

  // For Getting Requested Members 
  const getRequestedMember = async () => {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      const { authcontract } = state;

      const requestedMembers = await authcontract.methods
        .getApprovedOrRequestedMember(true)
        .call({ from: accounts[0], gas: 2000000 });
      setRequestedMembersArray(requestedMembers);
      setShowApproovedMemberInfo(false);
      setShowRequestedMemberInfo(true);
    } catch (error) {
      alert(error.message);
    }
  };

  // State for checking if user is LoggedIn or not and storing user Address
  const [loginUserAddress, setLoginUserAddress] = useState("");
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  // State to manege all loggedIn user Details
  const [loggedInUserInfo, setLoggedInUserInfo] = useState({
    name: "",
    role: "",
    email: "",
    userAddress: "",
  });

  // Function for Login User's
  const SignIn = async () => {
    // getting available accounts
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    const { authcontract } = state;

    setLoginUserAddress(accounts[0]);


    // calling smart contract's function
    try {
      // checks if user exist or not
      const userExist = await authcontract.methods
        .memberExistOrNot(accounts[0])
        .call({ from: accounts[0], gas: 200000 });

      // if user exist then - fetching user's data to show in our app
      if (userExist) {
        const findMember = await authcontract.methods
          .findMember(accounts[0], false)
          .call({ from: accounts[0], gas: 2000000 });

        setUserLoggedIn(true);
        setLoggedInUserInfo(findMember);
        alert("Login successfully!");

      }

      // if user does not exist
      else {
        alert("User does not exist. Signup and Request Approval First!");
      }
    } catch (err) {
      // catching errors
      alert(err.message);
    }
  };

  // Function For Approving Members
  const approoveMember = async (userAddress) => {
    // Getting Metamask Account 
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    // Accessing smart Contract
    const { authcontract } = state;
    // Calling Smart Contract Function
    try {
      const approove = await authcontract.methods
        .approoveRequest(userAddress, accounts[0])
        .send({ from: accounts[0], gas: 2000000 });
      alert('Member Approved');
      // In Case Of Any Errors It Gives Error In Alert
    } catch (err) {
      alert("Approval Interrupted!");
    }
  };

  const denyMember = async (userAddress) => {
    // Getting Metamask Account 
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    // Accessing smart Contract
    const { authcontract } = state;
    // Calling Smart Contract Function
    try {
      const deny = await authcontract.methods
        .denyRequest(userAddress)
        .send({ from: accounts[0], gas: 2000000 });
      alert('Member Denied');
      // In Case Of Any Errors It Gives Error In Alert
    } catch (err) {
        alert(err.message);
    }
  }

  // Function For Getting Approoved members
  const getApprovedMember = async () => {
    try {
      // Getting Metamask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { authcontract } = state;
      // Calling Smart Contract Function
      const approvedMembers = await authcontract.methods
        .getApprovedOrRequestedMember(false)
        .call({ from: accounts[0], gas: 2000000 });
      // Set Values in states
      setApproovedMembersArray(approvedMembers);
      setShowApproovedMemberInfo(true);
      setShowRequestedMemberInfo(false);
    } catch (error) {
      alert(error.message);
    }
  };

  // Function To remove Currently LoggedIn user's Info
  const logout = () => {
    setUserLoggedIn(false);
    setLoggedInUserInfo({
      name: "",
      role: "",
      email: "",
      userAddress: "",
    });
    alert("Logout Successfully!!")
  };

  // IPFS --------------------------------------------------------------------------------------------------------------------------------------
  // States for Manage Form Details And File
  const [selectedFile, setSelectedFile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [ipfslink, setIpfslink] = useState('');
  const [abstract, setAbstract] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [metaMaskAddress, setMetaMaskAddress] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [orcid, setOrcid] = useState('');


  // set all value for passing it to decision smart contract because it was removed when author submit the paper but we need that value for decision smart contract
  const [name2, setName2] = useState('');
  const [email2, setEmail2] = useState('');
  const [title2, setTitle2] = useState('');
  const [ipfslink2, setIpfslink2] = useState('');
  const [abstract2, setAbstract2] = useState('');
  const [metaMaskAddress2, setMetaMaskAddress2] = useState('');


  useEffect(() => {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
      loadMetaMaskAddress();
    }
  });

  const loadMetaMaskAddress = async () => {
    try {
      // Request access to MetaMask accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setMetaMaskAddress(accounts[0]);
      }
    } catch (error) {
      alert('Error retrieving MetaMask address:', error);
    }
  };

  // For Cheking Format Of Paper and Manage Paper Details
  const [fileSize, setFileSize] = useState(0);
  const [dimensions, setDimensions] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [author, setAuthor] = useState('');
  const [titles, setTitles] = useState('');
  const [tableOfContents, setTableOfContents] = useState([]);

  // Function For Handle FileChange 
  const handleFileChange = (event) => {
    // Take Selected File 
    try {
      const selectedeFile = event.target.files[0];
      setSelectedFile(selectedeFile);
      setUploadSuccess(false);
      // New object For Reader
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileType = selectedeFile.type;
        if (fileType === 'application/pdf') {
          import('pdfjs-dist').then((pdfjsLib) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
            // Loading Task Of Paper
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) });
            loadingTask.promise.then((pdf) => {
              setTotalPages(pdf.numPages);
              // For Getting PDF MetaData
              pdf.getMetadata().then((metadata) => {
                setAuthor(metadata.info.Author || '');
                setTitles(metadata.info.Title || '');
              });
              //For Getting PDF Titles
              pdf.getOutline().then((outline) => {
                if (outline) {
                  const headings = [];
                  const processOutline = (items) => {
                    for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      headings.push(item.title);

                      if (item.items.length > 0) {
                        processOutline(item.items);
                      }
                    }
                  };

                  processOutline(outline);
                  setTableOfContents(headings);
                } else {
                  setTableOfContents([]);
                }
              });
              // For Getting Number Of Pages
              pdf.getPage(1).then((page) => {
                const viewport = page.getViewport({ scale: 1 });
                const { width, height } = viewport;
                setDimensions(getDimensions(width, height));
              });
            });
          });
        } else {
          //Set All Values to States
          setDimensions(null);
          setTotalPages(0);
          setAuthor('');
          setTitles('');
          setTableOfContents([]);
        }
        // For Getting FileSize
        const fileSize = selectedeFile.size;
        setFileSize(fileSize);
      };

      reader.readAsArrayBuffer(selectedeFile);
    } catch (error) {
      alert("File Selection Error!!");
    }
  }
  // For Getting Dimensions Of Paper
  const getDimensions = (width, height) => {
    const a4Width = 595.276;
    const a4Height = 841.890;

    return { width, height, isA4: Math.abs(width - a4Width) < 1 && Math.abs(height - a4Height) < 1 };
  };

  // Function For Handle Name Changes
  const handleNameChange = (event) => {
    // Set Values To States
    setName(event.target.value);
  };

  // Function For ORCID Changes
  const handleOrcidChange = (event) => {
    // Set ORCID To States
    setOrcid(event.target.value);
  };
  // Function For Handle Email Changes 
  const handleEmailChange = (event) => {
    //Set Values To States
    setEmail(event.target.value);
  };
  // Function For Handle Title Changes
  const handleTitleChange = (event) => {
    //Set Values To States
    setTitle(event.target.value);
  };
  // Function For Handle Abstract Changes
  const handleAbstractChange = (event) => {
    //Set Values To States
    setAbstract(event.target.value);
  };

  // For Submit The Form 
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    try {
      if (!selectedFile) {
        console.log('No file selected');
        return;
      }
      // For Uploading The File To IPFS
      const storageClient = new Web3Storage({ token: process.env.REACT_APP_WEB3_STORAGE_API_KEY });

      const fileBlob = new Blob([selectedFile]);
      const file = new File([fileBlob], selectedFile.name, { type: selectedFile.type });


      setUploadingFile(true); // Set uploadingFile to true when starting the upload

      // Upload the file to web3 storage
      const cid = await storageClient.put([file]);
      const link = "https://ipfs.io/ipfs/" + cid;
      console.log(link);
      setIpfslink(link);
      console.log(ipfslink);

      // Hande Form Data
      const formData = {
        name,
        email,
        title,
        abstract,
        ipfslink,
        address: metaMaskAddress,
        orcid
      };

      console.log('Form data:', formData);
      setUploadSuccess(true);

    } catch (error) {
      alert('Error uploading file:', error);
    } finally {
      setUploadingFile(false); // Set uploadingFile to false after the upload completes
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setTitle('');
    setAbstract('');
    setSelectedFile(null);
    setUploadSuccess(false);
    setOrcid('')
  };

  // Main Contract ----------------------------------------------------------------------------------------------------------------------------

  // Getting paper info In Main Contract ---------------------------------------------------------------------------------\

  async function getPaperinfo() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart Contract Function
      const getPaperInfo = await maincontract.methods
        .getPaperInfo(name, email, abstract, title, ipfslink, metaMaskAddress)
        .send({ from: accounts[0], gas: 2000000 });
      alert('Paper Submitted Successfully !!')
    } catch (error) {
      alert(error.message);
    }
  }

  // EIC -----------------------------------------------------------------------------------------------
  //States To manage EIC Paper Details
  const [recievedByEICarray, setRecievedByEICarray] = useState([]);
  const [approvedByEICarray, setApprovedByEICarray] = useState([]);

  //Function for Sending Paper To EIC
  async function sendToEIC() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      //Calling Smart Contract Function
      const sendToEIC = await maincontract.methods
        .sendToEIC()
        .send({ from: accounts[0], gas: 2000000 });

    } catch (error) {
      alert(error.message);
    }
  }
  // Function For Getting paper To EIC Page
  async function RecievedByEIC() {
    try {
      //Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart Contract Function 
      const getrecievedByEIC = await maincontract.methods
        .getRecievedByEIC()
        .call({ from: accounts[0], gas: 2000000 });
      //Set Values To the State
      setRecievedByEICarray(getrecievedByEIC);
    } catch (error) {
      alert(error.message);
    }
  }

  //Function For EIC Approval for The Paper
  async function EICapproval() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart Contract Function
      const EICapproval = await maincontract.methods
        .EICapproval(true)
        .send({ from: accounts[0], gas: 2000000 });

    } catch (error) {
      alert(error.message);
    }
  }
  // For Getting Papers Which Approoved By EIC  
  async function getApprovedByEIC() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart Contract Function
      const getApprovedByEIC = await maincontract.methods
        .getApprovedByEIC()
        .call({ from: accounts[0], gas: 2000000 });
      setApprovedByEICarray(getApprovedByEIC);
      console.log(approvedByEICarray)
    } catch (error) {
      alert(error.message);
    }
  }

  // AE -------------------------------------------------------------------------------------
  // States To Manage Paper Details On AE Page
  const [receivedByAEarray, setReceivedByAEarray] = useState([]);
  const [approvedByAEarray, setApprovedByAEarray] = useState([]);

  //Function To Get Papers On AE Page
  async function ReceivedbyAE() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart contract Function
      const receivedByAE = await maincontract.methods
        .getRecievedByAE()
        .call({ from: accounts[0], gas: 2000000 });
      setReceivedByAEarray(receivedByAE);

    } catch (error) {
      alert(error.message);
    }
  }
  // Function For AE Approval 
  async function AEapproval() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart Contract Function
      const AEapproval = await maincontract.methods
        .AEapproval(true)
        .send({ from: accounts[0], gas: 2000000 });

    } catch (error) {
      alert(error.message);
    }
  }
  // Function For Getting Papers Which Approved By AE
  async function getApprovedByAE() {
    try {
      //Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart Contract Function
      const getApprovedByAE = await maincontract.methods
        .getApprovedByAE()
        .call({ from: accounts[0], gas: 2000000 });
      setApprovedByAEarray(getApprovedByAE);

    } catch (error) {
      alert(error.message);
    }
  }

  // Reviewer -------------------------------------------------------------------------------------
  // States To Manage Paper Details on REviewer Page
  const [receivedByReviewerarray, setReceivedByReviewerarray] = useState([]);
  const [reviewedByReviewerarray, setReviewedByReviewerarray] = useState([]);
  // Function For Getting Paper on Reviewer Page
  async function RecievedByReviewer() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling smart Contract Function
      const receivedByReviewer = await maincontract.methods
        .getRecievedByReviewer()
        .call({ from: accounts[0], gas: 2000000 });
      setReceivedByReviewerarray(receivedByReviewer);

    } catch (error) {
      alert(error.message);
    }
  }
  // For Getting Papers Which are Review ed By Reviewers
  async function getReviewedbyReviewers() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart Contract Function
      const getReviewedbyReviewer = await maincontract.methods
        .getReviewedbyReviewer()
        .call({ from: accounts[0], gas: 2000000 });
      setReviewedByReviewerarray(getReviewedbyReviewer);

    } catch (error) {
      alert(error.message);
    }
  }

  // Return to AE ------------------------------------------------------------------------------------------------------------------------
  // States To Manage paper Details On AE Page When Paper Get Back To the AE After Reviewed
  const [returnToAEarray, setReturnToAEarray] = useState([]);
  const [reviewedbyAEarray, setReviewedbyAEarray] = useState([]);

  // Function for getting Paper Back after Reviewed By Reviewer
  async function ReturntoAE() {
    try {
      // Accessing Metamask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Caaling Smart Contract Function
      const returnToAE = await maincontract.methods
        .RereceivedByAE()
        .call({ from: accounts[0], gas: 2000000 });
      setReturnToAEarray(returnToAE);

    } catch (error) {
      alert(error.message);
    }
  }
  // States tp Manage REviews of AE and REviewer
  const [AEr, setAEr] = useState('');
  const [Rr, setRr] = useState('');

  // Function For Get Papers Reviewed By AE
  async function ReviewedbyAE() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;
      // Calling Smart Contract Function
      const getReviewedbyAE = await maincontract.methods
        .getReviewedByAE()
        .call({ from: accounts[0], gas: 2000000 });
      setReviewedbyAEarray(getReviewedbyAE);
      // Mapping Array for Get Value of REviews And Author Address and Pass It To The Decision Contract
      reviewedbyAEarray.map((paper) => {
        // Set Values in State
        setAEr(paper.reviewofAE);
        setRr(paper.reviewofreviewer);
        setMetaMaskAddress2(paper.authorAddress);
        setIpfslink2(paper.linkofpaper);
        setTitle2(paper.papertitle);
        setAbstract2(paper.abstractofpaper);
        setEmail2(paper.email);
        setName2(paper.name);
      })
      console.log(AEr + "And" + Rr);
    } catch (error) {
      alert(error.message);
    }
  }
  //Function For Get Paper Info For Decision Contract
  async function getPaperinformation() {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { decisioncontract } = state;
      //Calling Smart Contract Function
      const getPaperfordecision = decisioncontract.methods
        .getPaperInfo(name2, email2, abstract2, title2, ipfslink2, Rr, AEr, metaMaskAddress2)
        .send({ from: accounts[0], gas: 2000000 });
    } catch (error) {
      alert(error.message);
    }
  }
  // Return to EIC ----------------------------------------------------------------------------------------------
  // State to Manage Paper in EIC page After Reviewed By AE
  const [returnToEICarray, setReturnToEICarray] = useState([]);
  // Function For Get Paper After Reviewed By AE
  async function ReturntoEIC() {
    try {
      //Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { decisioncontract } = state;
      // Calling Smart Contract Function
      const returnToEIC = await decisioncontract.methods
        .RerecievedByEIC()
        .call({ from: accounts[0], gas: 2000000 });
      setReturnToEICarray(returnToEIC);
      console.log(returnToEIC);
      console.log(returnToEICarray);

    } catch (error) {
      alert(error.message);
    }
  }
  // Function for Get EIC Final Decision For Paper
  async function EICFinalDecision(_Decision, _MessageToAuthor) {
    try {
      // Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { decisioncontract } = state;
      // Calling Smart Contract Function
      const EICFinal = await decisioncontract.methods
        .EICDecision(_Decision, _MessageToAuthor)
        .send({ from: accounts[0], gas: 2000000 });

    } catch (error) {
      alert(error.message);
    }
  }
  // State For Manage Published Papers
  const [publishpaperarray, setPublishpaperarray] = useState([]);
  // Function for Get Published Papers
  async function getPublishPaper() {
    try {
      //Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { decisioncontract } = state;
      // Calling Smart Contract Function
      const PublishedPaper = await decisioncontract.methods
        .getPublishedpaper()
        .call({ from: accounts[0], gas: 2000000 });
      setPublishpaperarray(PublishedPaper);

    } catch (error) {
      alert(error.message);
    }
  }
  // State For Manage Returned Paper To Author Page 
  const [returntoauthorarray, seReturnToAuthorarray] = useState([]);
  // Function for Getting Papers Wjich are Published Or Rejected On Author Page
  async function ReturnToAuthor() {
    try {
      //Accessing MetaMask Account
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { decisioncontract } = state;
      // Calling Smart Contract Function
      const Returntoauthor = await decisioncontract.methods
        .Returntoauthor()
        .call({ from: accounts[0], gas: 2000000 });
      seReturnToAuthorarray(Returntoauthor);

    } catch (error) {
      alert(error.message);
    }
  }


  // All The Routes Of the App
  return (
    <div className="App">

      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <Login
                SignIn={SignIn}
                setUserLoggedIn={setUserLoggedIn}
                setLoggedInUserInfo={setLoggedInUserInfo}
              />
            }
          ></Route>
          <Route
            path="/developerspace"
            element={
              <Developerspace />
            }
          ></Route>
          <Route
            path="/EICapproval"
            element={
              <ReceivedbyEICpage
                userLoggedIn={userLoggedIn}
                recievedByEICarray={recievedByEICarray}
                EICapproval={EICapproval}
                RecievedByEIC={RecievedByEIC}
              />
            }
          ></Route>
          <Route
            path="/PublishedPapers"
            element={
              <Publishpaperpage
                getPublishPaper={getPublishPaper}
                publishpaperarray={publishpaperarray}
              />
            }
          ></Route>
          <Route
            path="/ReturnToAuthor"
            element={
              <ReturnToAuthorpage
                userLoggedIn={userLoggedIn}
                ReturnToAuthor={ReturnToAuthor}
                returntoauthorarray={returntoauthorarray}
                loggedInUserInfo={loggedInUserInfo}
                reviewedbyAEarray={reviewedbyAEarray}
              />
            }
          ></Route>
          <Route
            path="/EICFinalApproval"
            element={
              <ReturntoEICpage
                userLoggedIn={userLoggedIn}
                ReturntoEIC={ReturntoEIC}
                EICFinalDecision={EICFinalDecision}
                returnToEICarray={returnToEICarray}
              />
            }
          ></Route>
          <Route
            path="/ReceivedByAE"
            element={
              <ReceivedbyAEpage
                userLoggedIn={userLoggedIn}
                receivedByAEarray={receivedByAEarray}
                AEapproval={AEapproval}
                ReceivedbyAE={ReceivedbyAE}

              />
            }
          ></Route>
          <Route
            path="/ReturnToAE"
            element={
              <ReturnToAEpage
                userLoggedIn={userLoggedIn}
                returnToAEarray={returnToAEarray}
                state={state}
                ReturntoAE={ReturntoAE}
              />
            }
          ></Route>
          <Route
            path="/ReviewedByAE"
            element={
              <ReviewedbyAEpage
                userLoggedIn={userLoggedIn}
                getPaperinformation={getPaperinformation}
                reviewedbyAEarray={reviewedbyAEarray}
                ReviewedbyAE={ReviewedbyAE}
              />
            }
          ></Route>
          <Route
            path="/ReceivedByReviewer"
            element={
              <ReceivedbyReviewerpage
                receivedByReviewerarray={receivedByReviewerarray}
                state={state}
                RecievedByReviewer={RecievedByReviewer}
                loggedInUserInfo={loggedInUserInfo}
                userLoggedIn={userLoggedIn}
              />
            }
          ></Route>
          <Route
            path="/ReviewedByReviewer"
            element={
              <ReviewedbyReviewerpage
                reviewedByReviewerarray={reviewedByReviewerarray}
                getReviewedbyReviewers={getReviewedbyReviewers}
                loggedInUserInfo={loggedInUserInfo}
                userLoggedIn={userLoggedIn}
              />
            }
          ></Route>
          <Route
            path="/ApprovedByAE"
            element={
              <ApprovedbyAEpage
                userLoggedIn={userLoggedIn}
                approvedByAEarray={approvedByAEarray}
                getApprovedByAE={getApprovedByAE}

              />
            }
          ></Route>
          <Route
            path="/ApprovedbyEICpage"
            element={
              <ApprovedbyEICpage
                userLoggedIn={userLoggedIn}
                approvedByEICarray={approvedByEICarray}
                getApprovedByEIC={getApprovedByEIC}
              />
            }
          ></Route>
          <Route
            path="/authorpapersubmit"
            element={
              <Authorpaper
                userLoggedIn={userLoggedIn}
                handleFormSubmit={handleFormSubmit}
                name={name}
                handleNameChange={handleNameChange}
                metaMaskAddress={metaMaskAddress}
                loadMetaMaskAddress={loadMetaMaskAddress}
                email={email}
                handleEmailChange={handleEmailChange}
                title={title}
                handleTitleChange={handleTitleChange}
                abstract={abstract}
                handleAbstractChange={handleAbstractChange}
                handleFileChange={handleFileChange}
                uploadingFile={uploadingFile}
                handleReset={handleReset}
                uploadSuccess={uploadSuccess}
                sendToEIC={sendToEIC}
                getPaperinfo={getPaperinfo}
                handleOrcidChange={handleOrcidChange}
                orcid={orcid}
                selectedFile={selectedFile}
                dimensions={dimensions}
              />
            }
          ></Route>
          <Route
            path="/signup"
            element={
              <Signup
                requestUser={requestUser}
                handleChange={handleChange}
                memberInfo={memberInfo}
              />
            }
          ></Route>
          <Route
            path="/profile"
            element={
              <Profile
                memberInfo={memberInfo}
                setMemberInfo={setMemberInfo}
                getRequestedMember={getRequestedMember}
                getApprovedMember={getApprovedMember}
                userLoggedIn={userLoggedIn}
                requestedMembersArray={requestedMembersArray}
                approovedMembersArray={approovedMembersArray}
                logout={logout}
                SignIn={SignIn}
                loggedInUserInfo={loggedInUserInfo}
                approoveMember={approoveMember}
                showApproovedMemberInfo={showApproovedMemberInfo}
                showRequestedMemberInfo={showRequestedMemberInfo}
                denyMember = {denyMember}
              />
            }
          ></Route>

        </Routes>
      </Router>
    </div>
  );
}


export default App;
