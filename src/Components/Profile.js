import React from 'react'
import { Link } from "react-router-dom";
import './Profile.css';
import '../App.css';

// All Entity Profiles Component
const Profile = (props) => {

  const {
    userLoggedIn,
    getRequestedMember,
    getApprovedMember,
    requestedMembersArray,
    approovedMembersArray,
    loggedInUserInfo,
    approoveMember,
    showApproovedMemberInfo,
    showRequestedMemberInfo,
    logout,
    denyMember
  } = props;


  // If LoggedIn User is JOURNAL 
  if (userLoggedIn && loggedInUserInfo.role === "JOURNAL") {
    // If LoggedIn User is JOURNAL and want to see approved members information
    if (showApproovedMemberInfo) {
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="row">
              <div className="col-4 text-end d-flex flex-column">
                <div>
                  <strong>Name: {loggedInUserInfo.name}</strong>
                </div><br></br>
                <div>
                  <strong>Role: {loggedInUserInfo.role}</strong>
                </div><br></br>
                <div>
                  <strong>Email: {loggedInUserInfo.email}</strong>
                </div><br></br>
                <div>
                  <strong>Address: {loggedInUserInfo.userAddress}</strong>
                </div><br></br>
                <Link to="/"><button onClick={logout}>Log Out</button></Link>
              </div>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
          </div>
          <div className="member-table dark:border-70">
            <table className="table table-dark ">
              <thead>
                <tr class="tab-head">
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Address</th>
                </tr>
              </thead>
              {/* mapping array for papers */}
              {
                <tbody>
                  {approovedMembersArray.map((member, index) => {
                    return (
                      <>
                        <tr>
                          <th>{index}</th>
                          <td>{member.name}</td>
                          <td>{member.role}</td>
                          <td>{member.email}</td>
                          <td>{member.userAddress}</td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              }
            </table>
          </div>
        </div>
      );
      // If LoggedIn User is JOURNAL and want to see requested members information
    } else if (showRequestedMemberInfo) {
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="row">
              <div className="col-4 text-end d-flex flex-column">
                <div>
                  <strong>Name: {loggedInUserInfo.name}</strong>
                </div><br></br>
                <div>
                  <strong>Role: {loggedInUserInfo.role}</strong>
                </div><br></br>
                <div>
                  <strong>Email: {loggedInUserInfo.email}</strong>
                </div><br></br>
                <div>
                  <strong>Address: {loggedInUserInfo.userAddress}</strong>
                </div><br></br>
                <Link to="/"><button onClick={logout}>Log Out</button></Link>
              </div>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
          </div>
          <div className="container dark:border-gray-70">
            <table className="table table-dark dark:border-gray-70 ">
              <thead>
                <tr className='tab-head'>
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Approove</th>
                  <th>Deny</th>
                </tr>
              </thead>
              {/* Mapping array for papers */}
              {
                <tbody>
                  {requestedMembersArray.map((member, index) => {
                    return (
                      <>
                        <tr>
                          <th>{index}</th>
                          <td>{member.name}</td>
                          <td>{member.role}</td>
                          <td>{member.email}</td>
                          <td>{member.userAddress}</td>
                          <td>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              fill="currentColor"
                              className="bi bi-check-circle"
                              viewBox="0 0 16 16"
                              onClick={() => {
                                approoveMember(member.userAddress);
                              }}
                            >
                              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                              <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                            </svg>
                          </td>
                          <td><button onClick={() => {denyMember(member.userAddress);}}>x</button></td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              }{" "}
            </table>
          </div>
        </div>
      );
    } else {
      // If LoggedIn User is JOURNAL 
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="col-4 text-end d-flex flex-column">
              <div>
                <strong>Name: {loggedInUserInfo.name}</strong>
              </div><br></br>
              <div>
                <strong>Role: {loggedInUserInfo.role}</strong>
              </div><br></br>
              <div>
                <strong>Email: {loggedInUserInfo.email}</strong>
              </div><br></br>
              <div>
                <strong>Address: {loggedInUserInfo.userAddress}</strong>
              </div><br></br>
              <Link to="/"><button onClick={logout}>Log Out</button></Link>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
          </div>
        </div>
      );
    }
    // If LoggedIn User is EIC 
  } else if (userLoggedIn && loggedInUserInfo.role === "EIC") {
    // If LoggedIn User is EIC and want to see approved members information
    if (showApproovedMemberInfo) {
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="row">
              <div className="col-4 text-end d-flex flex-column">
                <div>
                  <strong>Name: {loggedInUserInfo.name}</strong>
                </div><br></br>
                <div>
                  <strong>Role: {loggedInUserInfo.role}</strong>
                </div><br></br>
                <div>
                  <strong>Email: {loggedInUserInfo.email}</strong>
                </div><br></br>
                <div>
                  <strong>Address: {loggedInUserInfo.userAddress}</strong>
                </div><br></br>
                <Link to="/"><button onClick={logout}>Log Out</button></Link>
              </div>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
            <Link to="/EICapproval">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Recieved papers
              </button>
            </Link>
            <Link to="/ApprovedbyEICpage">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Assigned papers to AE
              </button>
            </Link>
            <Link to="/EICFinalApproval">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Papers With Final Decision
              </button>
            </Link>
          </div>
          <div className="member-table">
            <table className="table table-dark ">
              <thead>
                <tr className='tab-head'>
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Address</th>
                </tr>
              </thead>

              {
                <tbody>
                  {approovedMembersArray.map((member, index) => {
                    return (
                      <>
                        <tr>
                          <th>{index}</th>
                          <td>{member.name}</td>
                          <td>{member.role}</td>
                          <td>{member.email}</td>
                          <td>{member.userAddress}</td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              }
            </table>
          </div>
        </div>
      );
      // If LoggedIn User is EIC and want to see requested members information
    } else if (showRequestedMemberInfo) {
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="row">
              <div className="col-4 text-end d-flex flex-column">
                <div>
                  <strong>Name: {loggedInUserInfo.name}</strong>
                </div><br></br>
                <div>
                  <strong>Role: {loggedInUserInfo.role}</strong>
                </div><br></br>
                <div>
                  <strong>Email: {loggedInUserInfo.email}</strong>
                </div><br></br>
                <div>
                  <strong>Address: {loggedInUserInfo.userAddress}</strong>
                </div><br></br>
                <Link to="/"><button onClick={logout}>Log Out</button></Link>
              </div>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
            <Link to="/EICapproval">
              <button
                type="submit"
                className="btn btn-primary"
              >
             Recieved papers
              </button>
            </Link>
            <Link to="/ApprovedbyEICpage">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Assigned papers to AE
              </button>
            </Link>
            <Link to="/EICFinalApproval">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Papers With Final Decision
              </button>
            </Link>
          </div>
          <div className="container dark:border-gray-70">
            <table className="table table-dark dark:border-gray-70">
              <thead>
                <tr className='tab-head'>
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Approove</th>
                  <th>Deny</th>
                </tr>
              </thead>
              {
                <tbody>
                  {requestedMembersArray.map((member, index) => {
                    return (
                      <>
                        <tr>
                          <th>{index}</th>
                          <td>{member.name}</td>
                          <td>{member.role}</td>
                          <td>{member.email}</td>
                          <td>{member.userAddress}</td>
                          <td>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              fill="currentColor"
                              className="bi bi-check-circle"
                              viewBox="0 0 16 16"
                              onClick={() => {
                                approoveMember(member.userAddress);
                              }}
                            >
                              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                              <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                            </svg>
                          </td>
                          <td><button onClick={() => {denyMember(member.userAddress);}}>x</button></td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              }{" "}
            </table>
          </div>
        </div>
      );
    } else {
      // If LoggedIn User is EIC
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="col-4 text-end d-flex flex-column">
              <div>
                <strong>Name: {loggedInUserInfo.name}</strong>
              </div><br></br>
              <div>
                <strong>Role: {loggedInUserInfo.role}</strong>
              </div><br></br>
              <div>
                <strong>Email: {loggedInUserInfo.email}</strong>
              </div><br></br>
              <div>
                <strong>Address: {loggedInUserInfo.userAddress}</strong>
              </div><br></br>
              <Link to="/"><button onClick={logout}>Log Out</button></Link>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
            <Link to="/EICapproval">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Recieved papers
              </button>
            </Link>
            <Link to="/ApprovedbyEICpage">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Assigned papers to AE
              </button>
            </Link>
            <Link to="/EICFinalApproval">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Papers With Final Decision
              </button>
            </Link>
          </div>
        </div>
      );
    }
    // If LoggedIn User is AE 
  } else if (userLoggedIn && loggedInUserInfo.role === "AE") {
    // If LoggedIn User is AE and want to see approved members information
    if (showApproovedMemberInfo) {
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="row">
              <div className="col-4 text-end d-flex flex-column">
                <div>
                  <strong>Name: {loggedInUserInfo.name}</strong>
                </div><br></br>
                <div>
                  <strong>Role: {loggedInUserInfo.role}</strong>
                </div><br></br>
                <div>
                  <strong>Email: {loggedInUserInfo.email}</strong>
                </div><br></br>
                <div>
                  <strong>Address: {loggedInUserInfo.userAddress}</strong>
                </div><br></br>
                <Link to="/"><button onClick={logout}>Log Out</button></Link>
              </div>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
            <Link to="/ReceivedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Recieved papers
              </button>
            </Link>
            <Link to="/ApprovedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Assigned papers to Reviewer
              </button>
            </Link>
            <Link to="/ReturnToAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
             Paper awaited to be review
              </button>
            </Link>
            <Link to="/ReviewedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Reviewed By You
              </button>
            </Link>
          </div>
          <div className="member-table">
            <table className="table table-dark ">
              <thead>
                <tr className='tab-head'>
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Address</th>
                </tr>
              </thead>
              {
                <tbody>
                  {approovedMembersArray.map((member, index) => {
                    return (
                      <>
                        <tr>
                          <th>{index}</th>
                          <td>{member.name}</td>
                          <td>{member.role}</td>
                          <td>{member.email}</td>
                          <td>{member.userAddress}</td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              }
            </table>
          </div>
        </div>
      );
      // If LoggedIn User is AE and want to see requested members information
    } else if (showRequestedMemberInfo) {
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="row">
              <div className="col-4 text-end d-flex flex-column">
                <div>
                  <strong>Name: {loggedInUserInfo.name}</strong>
                </div><br></br>
                <div>
                  <strong>Role: {loggedInUserInfo.role}</strong>
                </div><br></br>
                <div>
                  <strong>Email: {loggedInUserInfo.email}</strong>
                </div><br></br>
                <div>
                  <strong>Address: {loggedInUserInfo.userAddress}</strong>
                </div><br></br>
                <Link to="/"><button onClick={logout}>Log Out</button></Link>
              </div>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
            <Link to="/ReceivedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Recieved papers
              </button>
            </Link>
            <Link to="/ApprovedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Assigned papers to Reviewer
              </button>
            </Link>
            <Link to="/ReturnToAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
             Paper awaited to be review
              </button>
            </Link>
            <Link to="/ReviewedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Reviewed by You
              </button>
            </Link>
          </div>

          <div className="container dark:border-gray-70">
            <table className="table table-dark dark:border-gray-70">
              <thead>
                <tr className='tab-head'>
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Approove</th>
                  <th>Deny</th>
                </tr>
              </thead>
              {
                <tbody>
                  {requestedMembersArray.map((member, index) => {
                    return (
                      <>
                        <tr>
                          <th>{index}</th>
                          <td>{member.name}</td>
                          <td>{member.role}</td>
                          <td>{member.email}</td>
                          <td>{member.userAddress}</td>
                          <td>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              fill="currentColor"
                              className="bi bi-check-circle"
                              viewBox="0 0 16 16"
                              onClick={() => {
                                approoveMember(member.userAddress);
                              }}
                            >
                              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                              <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                            </svg>
                          </td>
                          <td><button onClick={() => {denyMember(member.userAddress);}}>x</button></td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              }{" "}
            </table>
          </div>
        </div>
      );
    } else {
      // If LoggedIn User is AE 
      return (
        <div className="container-fluid d-flex flex-column">
          <div><strong><h1>Your Profile</h1></strong></div>
          <div className="d-flex flex-column my-5">
            <div className="col-4 text-end d-flex flex-column">
              <div>
                <strong>Name: {loggedInUserInfo.name}</strong>
              </div><br></br>
              <div>
                <strong>Role: {loggedInUserInfo.role}</strong>
              </div><br></br>
              <div>
                <strong>Email: {loggedInUserInfo.email}</strong>
              </div><br></br>
              <div>
                <strong>Address: {loggedInUserInfo.userAddress}</strong>
              </div><br></br>
              <Link to="/"><button onClick={logout}>Log Out</button></Link>
            </div>
          </div>
          <div className="w-100 d-flex justify-content-evenly">
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getRequestedMember}
            >
              Get Requested Members
            </button>
            <button
              className="my-2 btn btn-primary mx-1"
              onClick={getApprovedMember}
            >
              Get Members
            </button>
            <Link to="/ReceivedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Recieved papers
              </button>
            </Link>
            <Link to="/ApprovedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Assigned papers to Reviewer
              </button>
            </Link>
            <Link to="/ReturnToAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
             Paper awaited to be review
              </button>
            </Link>
            <Link to="/ReviewedByAE">
              <button
                type="submit"
                className="btn btn-primary"
              >
              Reviewed by You
              </button>
            </Link>
          </div>
        </div>
      );
    }
    // If LoggedIn User is REVIEWER 
  } else if (userLoggedIn && loggedInUserInfo.role === "REVIEWER") {
    return (
      <div className="container-fluid d-flex flex-column">
        <div><strong><h1>Your Profile</h1></strong></div>
        <div className="d-flex flex-column my-5">
          <div className="row">
            <div className="col-4 text-end d-flex flex-column">
              <div>
                <strong>Name: {loggedInUserInfo.name}</strong>
              </div><br></br>
              <div>
                <strong>Role: {loggedInUserInfo.role}</strong>
              </div><br></br>
              <div>
                <strong>Email: {loggedInUserInfo.email}</strong>
              </div><br></br>
              <div>
                <strong>Address: {loggedInUserInfo.userAddress}</strong>
              </div><br></br>
              <Link to="/"><button onClick={logout}>Log Out</button></Link>
            </div>
          </div>
        </div>
        <div className="w-100 d-flex justify-content-evenly">
          <Link to="/ReceivedByReviewer">
            <button
              type="submit"
              className="btn btn-primary"
            >
            Recieved papers
            </button>
          </Link>
          <Link to="/ReviewedByReviewer">
            <button
              type="submit"
              className="btn btn-primary"
            >
            Reviewed by You
            </button>
          </Link>
        </div>
      </div>
    )
    // If LoggedIn User is AUTHOR 
  } else if (userLoggedIn && loggedInUserInfo.role === "AUTHOR") {
    return (
      <div className="container-fluid d-flex flex-column">
        <div><strong><h1>Your Profile</h1></strong></div>
        <div className="d-flex flex-column my-5">
          <div className="row">
            <div className="col-4 text-end d-flex flex-column">
              <div>
                <strong>Name: {loggedInUserInfo.name}</strong>
              </div><br></br>
              <div>
                <strong>Role: {loggedInUserInfo.role}</strong>
              </div><br></br>
              <div>
                <strong>Email: {loggedInUserInfo.email}</strong>
              </div><br></br>
              <div>
                <strong>Address: {loggedInUserInfo.userAddress}</strong>
              </div><br></br>
              <Link to="/"><button onClick={logout}>Log Out</button></Link>
            </div>
          </div>
        </div>
        <div className="w-100 d-flex justify-content-evenly">
          <Link to="/authorpapersubmit">
            <button
              type="submit"
              className="btn btn-primary"
            >
            Submit a new manuscript
            </button>
          </Link>
          <Link to="/ReturnToAuthor">
            <button
              type="submit"
              className="btn btn-primary"
            >
            Your previous papers
            </button>
          </Link>
        </div>
      </div>
    )
  } else {
    // If User is not LoggedIn
    return (
      <div className="container">
        <h3 class='bale'>
          <Link to="/">Log in</Link> to Interaction with Website.
        </h3>
      </div>
    );
  }
}

export default Profile;