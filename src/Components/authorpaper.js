import React from 'react';
import './authorpaper.css';
import { Link } from 'react-router-dom';


// Author Paper Submit Page Component 
const AuthorPages = (props) => {

  const { handleFormSubmit, name, handleNameChange, metaMaskAddress, loadMetaMaskAddress, email, handleEmailChange,
    title, handleTitleChange, abstract, handleAbstractChange, handleFileChange, uploadingFile, handleReset, uploadSuccess,
    sendToEIC, getPaperinfo, orcid, handleOrcidChange, dimensions, userLoggedIn } = props;

if (userLoggedIn) {
  return (
    <>
      <div className="upload-page">
        <nav className="navbar">
          <div className="navbar-left">
            <strong className='logo'>Author Profile</strong>
          </div>
          <strong><Link to="/profile">Go To Profile</Link></strong>
        </nav>
        <br></br>
        <br></br>
        <div>
          <form className="upload-form" onSubmit={handleFormSubmit}>

            <div>
              <label>Name:</label>
              <input type="text" value={name} onChange={handleNameChange} required/>
            </div>
            <br></br>
            <div>
              <label>ORCID ID:</label>
              <input type="text" value={orcid} onChange={handleOrcidChange} required />
            </div>
            <br></br>

            <div>
              <label>MetaMask Address:</label>
              <input type="text" value={metaMaskAddress} readOnly />
              <button className="retrieve-button" type="button" onClick={loadMetaMaskAddress}>
                Retrieve Address
              </button>
            </div>
            <br></br>

            <div>
              <label>Email:</label>
              <input type="email" value={email} onChange={handleEmailChange} required/>
            </div>
            <br></br>

            <div>
              <label>Title:</label>
              <input type="text" value={title} onChange={handleTitleChange} required/>
            </div>
            <br></br>

            <div>
              <label>Abstract:</label>
              <textarea value={abstract} onChange={handleAbstractChange} required />
            </div>
            <br></br>

            <div>
              <label>Upload File:</label>
              <strong> Only PDF Format is Accepted.</strong>        <br></br>

              <input type="file" onChange={handleFileChange} required/>
            </div>
            <br></br>
            <div>
              {dimensions && (
                <div>
                  {dimensions.isA4 ? <p> </p> : <strong>Format is not correct.</strong>}
                </div>
              )}
            </div>
            <div className="button-container">
              {dimensions && (<div>{dimensions.isA4 ? <button
                className={`upload-button ${uploadingFile ? 'loading' : ''}`}
                type="submit"
                disabled={uploadingFile}
                id="uploadbutton"
              >
                {uploadingFile ? 'Uploading...' : 'Upload File'}
              </button> : <></>}</div>)}
              {dimensions && (<div>{dimensions.isA4 ? 
              <Link to='/profile'>
                <button className="submit-button" type="button" onClick={() => { getPaperinfo(); sendToEIC(); handleReset(); }}>
                submit
              </button>
              </Link>: <></>}</div>)}
              <button className="reset-button" type="button" onClick={handleReset}>
                Reset
              </button>
            </div>
          </form>
          {uploadSuccess && <p className="upload-success-message">File uploaded successfully!</p>}
        </div>
        <br></br>
      </div>
    </>
  );
} else {
  return (
    <div className="container">
      <h3 class='bale'>
        <Link to="/">Log in</Link> to Interaction with Website.
      </h3>
    </div>
  );
}
}

export default AuthorPages
