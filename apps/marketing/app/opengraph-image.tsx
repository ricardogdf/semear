import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "64px",
          background:
            "radial-gradient(circle at top left, rgba(244,191,76,0.28), transparent 30%), linear-gradient(135deg, #0b1f19, #15352c)",
          color: "white",
          fontFamily: "sans-serif",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "70%" }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "10px 18px",
              borderRadius: "999px",
              fontSize: "24px",
            }}
          >
            Semear
          </div>
          <div style={{ fontSize: "72px", fontWeight: 700, lineHeight: 1.05 }}>
            Gestao inteligente de estudos com ritmo e clareza.
          </div>
          <div style={{ fontSize: "30px", opacity: 0.82 }}>
            Dashboard, uploads, simulados sequenciais e pomodoro em um monorepo moderno.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
