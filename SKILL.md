---
name: robinhood-nft-tracker
description: Locate and track fresh Robinhood Chain NFT mints, identifying free mints and high-momentum collections in real-time.
tags: [robinhood, nft, mints, tracker, momentum]
---

# Robinhood NFT Mint Tracker

Track, locate, and analyze fresh ERC-721 and ERC-1155 NFT mints on Robinhood Chain.

## Overview
Identifies new mint events by filtering Robinhood Chain RPC logs for `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)` where `from == 0x0000000000000000000000000000000000000000`.

## Triggers
Activate when the user asks:
- "What free NFTs are minting on Robinhood?"
- "What's minting on Robinhood right now?"
- "Show Robinhood NFT mint momentum"
- "Any fresh Robinhood mints?"

## Data Detection Rules
- **Free Mints**: Transactions where `msg.value == 0` and no internal ERC-20 payment transfer is present.
- **Momentum Scoring**:
  - Velocity: Mints per minute over rolling 5m and 15m windows.
  - Wallet Uniqueness: Ratio of unique minter addresses to total mint transactions.
  - Gas Priority: Minter priority fee activity.

## Robinhood Chain Details
- **Chain ID**: `4663`
- **RPC**: Robinhood Chain Node / RPC
- **Explorer**: Robinhood Chain Explorer

