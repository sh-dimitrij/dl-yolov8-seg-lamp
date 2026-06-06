import React from "react";
import "../style/App.css";

const Loader = (props) => {
  return (
    <div className="wrapper">
      <div className="spinner"></div>
      <p>{props.children}</p>
    </div>
  );
};

export default Loader;