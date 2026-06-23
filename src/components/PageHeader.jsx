import React from 'react';

export default function PageHeader({ title, highlight, subtitle }) {
  return (
    <div className="page-hero">
      <h1 className="page-hero-title">
        {title}
        {highlight && <> <span className="highlight">{highlight}</span></>}
      </h1>
      {subtitle && <p className="page-hero-sub">{subtitle}</p>}
    </div>
  );
}
