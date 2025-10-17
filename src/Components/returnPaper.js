import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

// After Publishing or Rejecting Paper Result Will Shown To The Author Component
const ReturnAuthorpage = (props) => {
  const { returntoauthorarray, ReturnToAuthor, loggedInUserInfo, userLoggedIn } = props;

  useEffect(() => {
    ReturnToAuthor();
  })

  if(userLoggedIn) {
  return (
    <>
      <div><strong><h1>Your Papers</h1></strong></div>
      <Link to='/profile'><strong className='profile'> Go To Profile</strong></Link>
      <table className="table table-dark ">
        {
          <tbody>
            {returntoauthorarray.map((paper, index) => {
              if (loggedInUserInfo.userAddress === paper.authorAddress) {
                return (
                  <>
                  <tr bgcolor = " #b272ea"><th>Index</th><th>{index}</th></tr>
                  <tr><th bgcolor = "#e2a1f2">Abstract of Paper</th><td>{paper.abstractofpaper}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Title of Paper</th><td>{paper.papertitle}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Link of Paper</th><td><strong><a href={paper.linkofpaper} target='_blank' rel="noreferrer">View Paper</a></strong></td></tr>
                  <tr><th bgcolor = "#e2a1f2">Reviewer's Remarks</th><td>{paper.reviewofreviewer}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">AE's Remarks</th><td>{paper.reviewofAE}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Result</th><td><strong>{paper.messagetoauthor}</strong></td></tr>
                  <br></br>
                  </>
                );
              }
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


export default ReturnAuthorpage;