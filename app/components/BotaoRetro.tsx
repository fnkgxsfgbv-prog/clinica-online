"use client";

export default function BotaoRetro({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  function tocarSom() {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    osc.frequency.value = 500;
    osc.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.04);
  }

  return (
    <button
      onClick={() => {
        tocarSom();
        if (onClick) onClick();
      }}
      style={{
        background: "#dcdcdc",
        borderTop: "2px solid #fff",
        borderLeft: "2px solid #fff",
        borderRight: "2px solid #555",
        borderBottom: "2px solid #555",
        padding: "6px 12px",
        cursor: "pointer",
        fontFamily: "Tahoma",
      }}
    >
      {children}
    </button>
  );
}