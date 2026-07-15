import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#a12915",
        }}
      >
        <div
          style={{
            width: "84%",
            height: "84%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "3px dashed #cfc1b3",
            color: "#fdf8f0",
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -4,
          }}
        >
          CN
        </div>
      </div>
    ),
    { ...size },
  );
}
