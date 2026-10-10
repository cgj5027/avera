# Ask Avera chat layout review

Changes on `stage3-codex-review` preserve the shared conversation component and backend request behavior.

- Full-page chat uses a 1152px maximum shell instead of 768px; desktop drawer grows from 512px to 672px and remains full width on mobile.
- The dedicated page fits the available viewport beneath the navigation and Demo Mode banner. Only the message log scrolls; the composer stays at the bottom above mobile navigation. Dynamic viewport units accommodate browser resizing.
- On the chat page, Demo Mode details and reset/exit controls remain available in a keyboard-accessible disclosure, leaving more room for messages on small screens. Other pages retain their expanded banner.
- Suggested questions remain available in the scrollable conversation area. Long responses no longer compete with a scrollable composer footer.
- The message box has a visible label, a multiline textarea and keyboard instructions. Enter sends, Shift+Enter inserts a line break, and IME composition does not submit. User-message line breaks are preserved.
- Replies follow the latest message while the reader is near the bottom. Scrolling to earlier messages does not move the composer. The existing drawer retains Escape dismissal and launcher focus restoration.

## Design compliance

Validated against `avera_design_system.md` sections 9, 20, 23 and 24. Existing forest user bubbles, sage assistant surfaces, semantic light/dark tokens, rounded cards and 44px primary actions remain. One shared conversation/composer serves both views; no duplicate chat implementation was added. Mobile page subtitles are hidden to preserve space for messages while the read-only explanation remains in the conversation.

The prior mobile footer could scroll the input out of view and fixed minimum chat height could extend below navigation. These layouts have been replaced with a constrained flex layout and a non-scrolling composer. The drawer header also reserves space for its close control.

## Validation scope

`tests/chat-layout-browser.cjs` exercises actual built frontend components with intercepted API fixtures at 320/390/768/1440px in both themes, plus short mobile/desktop viewports and Demo Mode. It checks composer visibility and position during pending/long replies, independent message scrolling, multiline keyboard input, wider desktop bounds, horizontal overflow, WCAG A/AA and drawer focus restoration. This does not verify a real AI service or mobile software-keyboard behavior on physical devices.

Executed results: 84 chat browser checks and 20 Settings regression checks passed, with zero axe WCAG A/AA violations or horizontal overflow in tested states. The Settings subset covers reset confirmation, failed sync and disconnect after changes to the shared Demo Mode bar. `npm test` passed 167 tests with one existing expected failure for concurrent goal contributions. Lint, frontend type check, production build and diff whitespace checks passed.
