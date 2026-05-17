import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Author's view of their papers: pending submissions (still in EiC's queue)
// and decided papers (published or returned).
//
// Note on coverage: papers that have moved past EiC but haven't reached a
// final decision yet (in AE/Reviewer queues) are intentionally not surfaced
// here -- the Main contract doesn't expose a per-author getter, and walking
// every intermediate queue from this view would multiply RPC traffic. To
// inspect those mid-pipeline papers, switch MetaMask to the relevant
// reviewer's account and view their respective queue.
const ReturnAuthorpage = (props) => {
  const {
    returntoauthorarray,
    ReturnToAuthor,
    loggedInUserInfo,
    userLoggedIn,
    recievedByEICarray,
    RecievedByEIC,
  } = props;

  useEffect(() => {
    ReturnToAuthor();
    RecievedByEIC();
  }, []);

  if (!userLoggedIn) {
    return (
      <div className="container">
        <h3 className='bale'>
          <Link to="/">Log in</Link> to Interaction with Website.
        </h3>
      </div>
    );
  }

  const myAddress = (loggedInUserInfo.userAddress || '').toLowerCase();
  const isMine = (p) => (p.authorAddress || '').toLowerCase() === myAddress;

  const pending = (recievedByEICarray || []).filter(isMine);
  const decided = (returntoauthorarray || []).filter(isMine);

  return (
    <>
      <div><strong><h1>Your Papers</h1></strong></div>
      <Link to='/profile'><strong className='profile'> Go To Profile</strong></Link>

      <h2 style={{ marginTop: '1em' }}>Pending Submissions ({pending.length})</h2>
      <p>
        <em>
          Papers awaiting EIC's initial review. Once EIC approves, papers move
          through AE and Reviewer queues (not shown here); after final decision
          they appear in the Decided section below.
        </em>
      </p>
      {pending.length === 0 ? (
        <p><em>No pending submissions.</em></p>
      ) : (
        <table className="table table-dark">
          <tbody>
            {pending.map((paper, index) => (
              <React.Fragment key={`p-${index}`}>
                <tr bgcolor=" #b272ea"><th>Index</th><th>{index}</th></tr>
                <tr><th bgcolor="#e2a1f2">Status</th><td><strong>Awaiting EIC review</strong></td></tr>
                <tr><th bgcolor="#e2a1f2">Title</th><td>{paper.papertitle}</td></tr>
                <tr><th bgcolor="#e2a1f2">Abstract</th><td>{paper.abstractofpaper}</td></tr>
                <tr>
                  <th bgcolor="#e2a1f2">Link of Paper</th>
                  <td>
                    {paper.linkofpaper
                      ? <strong><a href={paper.linkofpaper} target='_blank' rel="noreferrer">View Paper</a></strong>
                      : <em>(no link stored)</em>}
                  </td>
                </tr>
                <br />
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: '1em' }}>Decided Papers ({decided.length})</h2>
      {decided.length === 0 ? (
        <p><em>None yet. Papers move here after EIC's final decision.</em></p>
      ) : (
        <table className="table table-dark">
          <tbody>
            {decided.map((paper, index) => (
              <React.Fragment key={`d-${index}`}>
                <tr bgcolor=" #b272ea"><th>Index</th><th>{index}</th></tr>
                <tr><th bgcolor="#e2a1f2">Title</th><td>{paper.papertitle}</td></tr>
                <tr><th bgcolor="#e2a1f2">Abstract</th><td>{paper.abstractofpaper}</td></tr>
                <tr>
                  <th bgcolor="#e2a1f2">Link of Paper</th>
                  <td>
                    {paper.linkofpaper
                      ? <strong><a href={paper.linkofpaper} target='_blank' rel="noreferrer">View Paper</a></strong>
                      : <em>(no link stored)</em>}
                  </td>
                </tr>
                <tr><th bgcolor="#e2a1f2">Reviewer's Remarks</th><td>{paper.reviewofreviewer}</td></tr>
                <tr><th bgcolor="#e2a1f2">AE's Remarks</th><td>{paper.reviewofAE}</td></tr>
                <tr><th bgcolor="#e2a1f2">Result</th><td><strong>{paper.messagetoauthor}</strong></td></tr>
                <br />
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

export default ReturnAuthorpage;
