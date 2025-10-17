import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Published papers page Component
const Publishedpaperspage = (props) => {
  const { publishpaperarray, getPublishPaper } = props;

  useEffect(() => {
    getPublishPaper();
  })

  return (
    <>
<strong><Link to = "/">Home</Link></strong>
      <div><strong><h1>Published Papers</h1></strong></div>
      <table className="table table-dark ">
        {
          <tbody>
            {publishpaperarray.map((paper, index) => {
              return (
                <>
                  <tr bgcolor = " #b272ea"><th>Index</th><th>{index}</th></tr>
                  <tr><th bgcolor = "#e2a1f2">Abstract of Paper</th><td>{paper.abstractofpaper}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Title of Paper</th><td>{paper.papertitle}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Link of Paper</th><td><strong><a href={paper.linkofpaper} target='_blank' rel="noreferrer">View Paper</a></strong></td></tr>
                  <tr><th bgcolor = "#e2a1f2">Author of Paper</th><td>{paper.name}</td></tr>
                  <tr><th bgcolor = "#e2a1f2">Email of Author</th><td>{paper.email}</td></tr>
                  <br></br>
                </>
              );
            })}
          </tbody>
        }
      </table>
    </>
  )
}


export default Publishedpaperspage;