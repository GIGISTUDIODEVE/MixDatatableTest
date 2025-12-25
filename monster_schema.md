# Monster Schema Specification

This document defines the official Firestore JSON schema for:
- monsters
- monsterVariants

It is fully compatible with the current stat / combat / skill / XP systems.

## Level Policy
finalStat = base + (level - 1) * growth

## Collections
- monsters
- monsterVariants

## monsters/{monsterId}
See main project spec for full field definitions.
