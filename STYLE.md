# STYLE.md

## General

- **Occam's Razor**: the simplest solution is usually the best.
- **DRY**: extract and reuse common logic.
- **Elegant, modular code**: small, focused files and functions.
- **Ask, don't guess**: clarify rather than assume.
- **Comment carefully**: explain why, not what; docstrings for public APIs.

## TypeScript

- **Linting/formatting:** Biome (`web/biome.json`).
- **Components:** PascalCase (`ChatThread`); **functions:** camelCase
  (`createChat`); file names match the component or module.
- Prefer `interface` over `type` for object shapes.
- Component files `export default` the component at the end of the file.
- Server-side writes are server actions in `web/lib/actions/*.ts`
  (`'use server'`), using the RLS client from `web/lib/supabase/server.ts`.
  A `'use server'` file exports only async functions.

### Import grouping

Three groups: standard library/React, third-party, then project imports.

```typescript
import { useState } from 'react';

import { useAuth } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';
import { createChat } from '@/lib/actions/chats';
```

## Python

- **Linting/formatting:** ruff; **type checking:** strict mypy (`mypy.ini`).
  Always include type hints. If extensive type errors appear, stop and ask.
- Use `x | None`, never `Optional`.
- Python 3.12 in both `api/` and `agent/`.

### Import grouping

```python
import json
from datetime import datetime

from fastapi import APIRouter

from app.config import settings
```

## CSS / Styling

- Use Tailwind utilities that reference tokens (`bg-bg`, `text-ink`,
  `text-muted`, `border-hair`, `border-line`, or shadcn's `bg-background`,
  `text-foreground`, …), never raw values like `bg-white` or `text-gray-500`.
- New tokens go in `web/app/globals.css` under `@theme`; there is no
  `tailwind.config` file.
- No inline `style` colors and no ad-hoc CSS files with color definitions.

## SQL

- One migration per change, `NNN_snake_case.sql`, opening with a header
  comment giving its title and rationale. Comment every table and column.
- Every user-owned table follows the RLS pattern in ARCHITECTURE.md.
