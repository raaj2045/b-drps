import React from 'react'
import './signup.css';
import { Link } from 'react-router-dom';

// Sign Up Page Component
const signup = (props) => {
  const { handleChange, requestUser, memberInfo } = props;
  return (
    <>
    
      <div className='form-sign'>
        <h1>Signup Form</h1>
        <hr></hr>
        <div className='FormContainer'>
          <div className='input'>
            <label><strong>Enter your name:</strong>
              <input
                className="p-1 text-center"
                type="text"
                placeholder="Enter Your Name"
                onChange={(e) => handleChange(e)}
                name="name"
                value={memberInfo.name}
                required
              />
            </label>
          </div>
          <div className='input'>
            <label><strong>Select Your Role:</strong>
              <select id='list'
                onChange={(e) => handleChange(e)}
                name="role"
                required
                value={memberInfo.role}>
                <option label='Select Role'></option>
                <option label='JOURNAL' value={"JOURNAL"}></option>
                <option label='EIC' value={"EIC"}></option>
                <option label='AE' value={"AE"}></option>
                <option label='REVIEWER' value={"REVIEWER"}></option>
                <option label='AUTHOR' value={"AUTHOR"}></option>
              </select>
            </label>
          </div>
          <div className='input'>
            <label><strong>Select Your Email:</strong>
              <input
                className="p-1 text-center"
                type="text"
                placeholder="Enter Your email"
                onChange={(e) => handleChange(e)}
                name="email"
                value={memberInfo.email}
                required
              />
            </label>
          </div>
          <div className='input'>
            <label><strong>Select Your Metamask Account Address:</strong>
              <input
                className="p-1 text-center"
                type="text"
                placeholder="Enter Your useraddress"
                onChange={(e) => handleChange(e)}
                name="useraddress"
                value={memberInfo.useraddress}
                required
              />
            </label>
          </div>
          <div className='btn-sign'>
            <Link to="/"><button onClick={requestUser}>Sign Up</button></Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default signup