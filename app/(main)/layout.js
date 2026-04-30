import React from 'react'

const MainLayout = ({ children }) => {
  return (
    <div className="container mx-auto">
      <div>{children}</div>
    </div>
  );
};

export default MainLayout;