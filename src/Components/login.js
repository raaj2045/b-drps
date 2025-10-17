import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import './login.css'

// Login Page Component 
function Login(props) {
  const { SignIn, setUserLoggedIn, setLoggedInUserInfo } = props;

  useEffect(() => {
    setUserLoggedIn(false);
    setLoggedInUserInfo({
      name: "",
      role: "",
      email: "",
      userAddress: "",
    });
  }, []);

  return (
    <div className="loginpage">
      <div>
        <h1><strong>The Research Paper Publishing System</strong></h1>
        <hr></hr>
      </div>
      <div className="container w-25 mb-5">
        <h2 className="mt-0 mb-3 text-center"><strong>Login To Your Account</strong></h2>
        <div className="mb-3">
        </div>
        <Link to="/profile">
          <button
            type="submit"
            className="btn btn-primary"
            onClick={() => { SignIn(); }}
            href="/login"
          >
            <strong>L O G I N</strong>
          </button>
        </Link>
        <p className="mt-2">
          <strong>Don't have an account?</strong>
          <Link to="/signup"><strong>Sign up</strong></Link>
        </p>
      </div>
      <Link to="/PublishedPapers">
        <button
          type="submit"
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

