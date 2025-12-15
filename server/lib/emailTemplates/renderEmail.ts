import React from "react";
import ReactDOMServer from "react-dom/server";

export const renderEmail = (template: React.ReactElement) => {
  return ReactDOMServer.renderToStaticMarkup(template);
};
