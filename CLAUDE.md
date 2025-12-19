# AI Assistant Guide

This file provides guidance to AI coding assistants when working with code in this repository. Adherence to these guidelines is crucial for maintaining code quality and consistency.


## Project Overview

This is a static site built with [Lume](https://lume.land/) v3.1.2, a Deno-powered static site generator.

This website is the comprehensive portal of the enterprise FUSIM, covering four sections: company introduction, company blog, product matrix, and corporate responsibility.


## Commands

- `deno task serve` - Run development server with live reload
- `deno task build` - Build site for production (outputs to `_site/`)
- `deno task lume <args>` - Run any Lume CLI command

## Architecture

- `_config.ts` - Lume site configuration
- `deno.json` - Deno configuration with tasks, imports, and permissions
- `_site/` - Build output directory (gitignored)
- `_cache/` - Lume cache directory (gitignored)

Lume uses file-based routing. Pages can be created as `.md`, `.html`, `.tsx`, `.jsx`, or other supported formats. Files/folders prefixed with `_` are treated as special (layouts, components, data) and not output as pages.
