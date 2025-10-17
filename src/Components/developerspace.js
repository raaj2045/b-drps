import React from 'react';
import './developerspace.css';
import rushik from '../profiles/student1.jpg';
import mihir from '../profiles/student2.jpeg';
import anbraeken from '../profiles/mentor1.jpeg';
import anshumaan from '../profiles/mentor2.jpg';
import { Link } from 'react-router-dom';


const developerspace = () => {
  return (
    <div>
      <strong><Link to = "/">Home</Link></strong>

    <div><h1>Students</h1></div>
    <div>
    <div className="profile-container">     
      <div className="profile-card">
        <div><h2>Student 1</h2></div>
          <img src={mihir} alt="Profile 2" />
        <div className="profile-details">
          <h2>Mihir Gohel</h2>
          <p><strong>gohelmihir27@gmail.com</strong></p>
          <p>4th Year, B.Tech IT</p>
          <p>CGPIT, Uka Tarsadia University</p>
          <p>Bardoli, Gujarat, India</p>
        </div>
      </div>
      <div className="profile-card">
      <div><h2>Student 2</h2></div>
          <img src={rushik} alt="Profile 1" />
        <div className="profile-details">
          <h2>Rushik Ghuntala</h2>
          <p><strong>rushisoni2003@gmail.com</strong></p>
          <p>4th Year, B.Tech IT</p>
          <p>CGPIT, Uka Tarsadia University</p>
          <p>Bardoli, Gujarat, India</p>
        </div>
      </div>
      </div>
      <div><h1>Mentors</h1></div>
      <div className="profile-container">
      <div className="profile-card">
      <div><h2>Mentor 1</h2></div>
        <img src={anbraeken} alt="Profile 3" />
        <div className="profile-details">
          <h2>Prof. Dr. An Braeken</h2>
          <p><strong>abraeken@gmail.com</strong></p>
          <p>Professor, Industrial Engineering Department</p>
          <p>Vrije Universiteit Brussel</p>
          <p>Belgium</p>
        </div>
      </div>
      <div className="profile-card">
      <div><h2>Mentor 2</h2></div>
        <img src={anshumaan} alt="Profile 4" />
        <div className="profile-details">
          <h2>Prof. Dr. Anshumaan Kalla</h2>
          <p><strong>kallaanshu@gmail.com</strong></p>
          <p>Proffessor, Department of Computer</p>
          <p>CGPIT, Uka Tarsadia University</p>
          <p>Bardoli, Gujarat, India</p>
        </div>
      </div>
      </div>
    </div>

    </div>
  );
};


export default developerspace;
