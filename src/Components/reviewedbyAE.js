import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

// After Reviewed By AE He can Check The Reviewed Papers Page Component
const ReviewedbyAEpage = (props) => {
  const { reviewedbyAEarray, ReviewedbyAE, getPaperinformation, userLoggedIn } = props;

  useEffect(() => {
    ReviewedbyAE();
  })

  if(userLoggedIn) {
  return (
    <>
      <Link to='/profile'><strong className='profile'> Go To Profile</strong></Link>
      <table className="table table-dark ">
        {
          <tbody>
            {reviewedbyAEarray.map((paper, index) => {
              return (
                <>
                  <tr bgcolor = " #b272ea"><th>Index</th><th>{index}</th></tr>
                  <tr><th bgcolor = "#e2a1f2">Abstract of Paper</th><td>{paper.abstractofpaper}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Title of Paper</th><td>{paper.papertitle}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Link of Paper</th><td><strong><a href={paper.linkofpaper} target='_blank' rel="noreferrer">View Paper</a></strong></td></tr>
                  <tr><th bgcolor = "#e2a1f2">Reviewer's Remarks</th><td>{paper.reviewofreviewer}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Your Remarks</th><td>{paper.reviewofAE}</td></tr>
                  <tr><button id="sendbutton" onClick={() => { getPaperinformation(); alert("Paper Sent Successfully !!"); document.getElementById('sendbutton').disabled = true; }}>Click Here To Send Above Paper to EIC For Final Decision</button></tr>
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


export default ReviewedbyAEpage;