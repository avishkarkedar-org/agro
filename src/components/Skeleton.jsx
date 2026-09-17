import React from "react";

export default function Skeleton({
  width = "100%",
  height = "20px",
  borderRadius = "8px",
  style = {},
  className = "",
}) {
  return (
    <div
      className={`skel ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}
