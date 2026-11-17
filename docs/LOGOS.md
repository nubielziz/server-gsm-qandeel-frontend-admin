# Payment method logos

The bundled logos of the ready-made payment methods (feature 32, backend B232, MISMATCHES M266). They live in `src/assets/payment-logos/`
and are read by `src/features/settings/lib/paymentLogos.ts` with `import.meta.glob`: a file is used when its name (without the extension) is
the key of a catalog entry, so a file added later is picked up with no code change. A method with no file shows an icon (a bank, a coin or a
card). A logo staff upload for one method is stored by the backend and wins over these files.

Logos are trademarks of their owners and are used here only to name the way of paying. Each row says where the file was taken from and on
what terms. Every file is 128 x 128 pixels, transparent where its source is.

| File | What it is | Source | Terms |
|---|---|---|---|
| `vodafone_cash.png` | Logo of Vodafone Cash (catalog entry `vodafone_cash`): the Vodafone speech mark in its red `#E60000` | Simple Icons `vodafone` (`https://cdn.simpleicons.org/vodafone`), 2026-11-17 | CC0-1.0 icon data; trademark of its owner |
| `fawry_transfer.png` | Logo of Fawry (catalog entry `fawry_transfer`): the Fawry mark in its yellow `#FFD300` | Simple Icons `fawry` (`https://cdn.simpleicons.org/fawry`), 2026-11-17 | CC0-1.0 icon data; trademark of its owner |
| `instapay.png` | Logo of InstaPay (catalog entry `instapay`): the InstaPay Egypt app icon | the app's Google Play listing (`com.egyptianbanks.instapay`), 2026-11-17 | trademark of its owner |
| `binance_pay.png` | Logo of Binance Pay (catalog entries `binance_pay` and `binance_pay_auto`): the Binance mark in its yellow `#F0B90B` | Simple Icons `binance` (`https://cdn.simpleicons.org/binance`), 2026-11-17 | CC0-1.0 icon data; trademark of its owner |
| `nowpayments.png` | Logo of NOWPayments (catalog entry `nowpayments`): the company's square logo | its GitHub organisation picture (`https://github.com/NowPaymentsIO.png`), 2026-11-17 | trademark of its owner |

No file is drawn or downloaded by the console's code. Bank transfer and Crypto transfer have no logo file: they show the bank and the coin icon.

## The IMEI-HUB mark

`src/assets/brand/logo-mark.png` (dark ink, the light theme) and `logo-mark-inverse.png` (white ink, the dark theme) are the "IH"
in its orbit (149 × 112, transparent), cut from the owner's own logo picture (`IH Orbit IMEI-HUB Logo.png`, supplied 2026-11-17)
by a script that only crops, removes the white ground and, for the second file, turns the dark ink white. `public/favicon.ico` is
the same mark on a white tile (16, 32 and 48 px), so the dark ink reads on a dark tab strip. `src/components/ui/BrandMark.tsx` shows the pair (the style sheet picks the one that fits the theme);
the name "IMEI-HUB" beside it is text. The owner's source picture, the script and the larger files are kept outside the repository
(`/home/saifi/gsm-project/.brand/`).
