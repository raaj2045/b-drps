import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Reviewed By Reviewer Page Component
const ReviewedbyReviewerpage = (props) => {
  const { reviewedByReviewerarray, getReviewedbyReviewers, loggedInUserInfo, userLoggedIn } = props;

  useEffect(() => {
    getReviewedbyReviewers();
  },)

  if(userLoggedIn) {
  return (
    <>
      <Link to='/profile'><strong className='profile'> Go To Profile</strong></Link>
      <table className="table table-dark ">
        {
          <tbody>
            {reviewedByReviewerarray.map((paper, index) => {
              if (paper.reviewerAddress === loggedInUserInfo.userAddress) {
                return (
                  <>
                  <tr bgcolor = " #b272ea"><th>Index</th><th>{index}</th></tr>
                  <tr><th bgcolor = "#e2a1f2">Abstract of Paper</th><td>{paper.abstractofpaper}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Title of Paper</th><td>{paper.papertitle}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Link of Paper</th><td><strong><a href={paper.linkofpaper} target='_blank' rel="noreferrer">View Paper</a></strong></td></tr>
                  <tr><th bgcolor = "#e2a1f2">Your Review</th><td>{paper.reviewofreviewer}</td></tr>
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


export default ReviewedbyReviewerpage;