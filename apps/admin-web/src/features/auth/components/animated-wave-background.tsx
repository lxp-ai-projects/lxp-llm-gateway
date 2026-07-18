export function AnimatedWaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="auth-wave-background"
      data-testid="auth-wave-background"
    >
      <svg
        className="auth-wave-svg"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <defs>
          <linearGradient id="auth-wave-cyan" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#7ff4e2" stopOpacity="0.16" />
            <stop offset="1" stopColor="#0d8ca9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="auth-wave-blue" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#0a80b1" stopOpacity="0" />
            <stop offset="0.5" stopColor="#63e6d1" stopOpacity="0.3" />
            <stop offset="1" stopColor="#0a80b1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="auth-wave auth-wave-far">
          <path d="M-80 640C210 500 410 790 725 620S1190 390 1520 540V980H-80Z" />
        </g>
        <g className="auth-wave auth-wave-mid">
          <path d="M-90 510C205 390 444 670 740 510S1185 300 1530 450V980H-90Z" />
        </g>
        <g className="auth-wave auth-wave-near">
          <path d="M-120 735C175 585 460 855 760 675S1195 480 1560 630V980H-120Z" />
        </g>
        <path
          className="auth-wave-line auth-wave-line-one"
          d="M-40 470C235 344 458 612 748 462S1180 260 1490 398"
        />
        <path
          className="auth-wave-line auth-wave-line-two"
          d="M-80 690C240 554 468 820 768 642S1170 456 1510 588"
        />
      </svg>
    </div>
  );
}
