import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Received By Reviewer Page Commponent 
const PaperdataReviewer = (props) => {
  const { receivedByReviewerarray, RecievedByReviewer, state, loggedInUserInfo, userLoggedIn } = props;

  const [remark, setRemark] = useState('');

  async function handleremark(event) {
    setRemark(event.target.value);
  }

  // Function for Taking Reviewer's Remarks For Paper
  async function Reviewerapproval() {
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const { maincontract } = state;

      const Reviewerapproval = await maincontract.methods
        .Reviewerapproval(true, remark, loggedInUserInfo.userAddress)
        .send({ from: accounts[0], gas: 2000000 });

    } catch (error) {
      alert(error.message);
    }
  }

  useEffect(() => {
    RecievedByReviewer();
  })

  if( userLoggedIn ) {
  return (
    <>
      <Link to='/profile'><strong className='profile'> Go To Profile</strong></Link>
      <table className="table table-dark ">
        {
          <tbody>
            {receivedByReviewerarray.map((paper, index) => {
              return (
                <>
                  <tr bgcolor = " #b272ea"><th>Index</th><th>{index}</th></tr>
                  <tr><th bgcolor = "#e2a1f2">Abstract of Paper</th><td>{paper.abstractofpaper}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Title of Paper</th><td>{paper.papertitle}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Link of Paper</th><td><strong><a href={paper.linkofpaper} target='_blank' rel="noreferrer">View Paper</a></strong></td></tr>
                  <tr><th bgcolor = "#e2a1f2">Add Your Remarks</th><td><textarea id='remark' name='remark' value={remark} onChange={handleremark}></textarea></td></tr>
                  <tr><th bgcolor = "#e2a1f2">Send to AE</th><td>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-check-circle"
                        viewBox="0 0 16 16"
                        onClick={() => {
                          Reviewerapproval();
                        }}
                      >
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                        <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                      </svg>
                    </td>
                    </tr>
                  <br></br>
                </>
              );
            })}
          </tbody>
        }
      </table>
    </>
  )
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


export default PaperdataReviewer;