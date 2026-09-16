#!/usr/bin/env python3
"""
Pre-deploy sanity checks for the Burgers N Beyond static site.

Runs against the Eleventy BUILD OUTPUT (_site/), not the src/ templates —
that's what actually ships, and the only place a broken include/permalink
would show up as a real broken link. Run `npm run build` first (the CI
workflow does this before calling this script; locally, run it yourself
if _site/ is stale or missing).

Runs automatically on every push/PR via .github/workflows/checks.yml, and
can be run locally too: npm run build && python3 scripts/check_site.py

Deliberately scoped to checks that are 100% signal, zero noise — every
failure here means a real problem worth fixing before it goes live, never
a style nitpick. Does NOT attempt full HTML5 validation (inline `style`
attributes and similar are used deliberately throughout this project; a
generic strict linter would just be noise to dismiss, not signal to act on).

Checks:
  - Every local href="..."/src="..." in the HTML files resolves to a real
    file (catches typos, deleted-but-still-referenced images, etc.)
  - site.webmanifest is valid JSON
  - Every <script type="application/ld+json"> block is valid JSON
  - sitemap.xml is well-formed XML
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(PROJECT_ROOT, '_site')
errors = []

if not os.path.isdir(ROOT):
    print('_site/ not found — run `npm run build` first.')
    sys.exit(1)


def error(msg):
    errors.append(msg)


def check_internal_references():
    html_files = [f for f in os.listdir(ROOT) if f.endswith('.html')]
    attr_pattern = re.compile(r'(?:href|src)="([^"]+)"')
    for filename in html_files:
        path = os.path.join(ROOT, filename)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        for match in attr_pattern.finditer(content):
            ref = match.group(1)
            if ref.startswith(('http://', 'https://', 'mailto:', 'tel:', '#', 'data:', 'javascript:')):
                continue
            ref_path = ref.split('#')[0].split('?')[0]
            if not ref_path:
                continue
            resolved = os.path.normpath(os.path.join(ROOT, ref_path))
            if not os.path.isfile(resolved):
                error('{}: broken reference "{}" (resolved to {}, file does not exist)'.format(
                    filename, ref, os.path.relpath(resolved, ROOT)))


def check_manifest():
    manifest_path = os.path.join(ROOT, 'site.webmanifest')
    if not os.path.isfile(manifest_path):
        error('site.webmanifest is missing')
        return
    try:
        with open(manifest_path, encoding='utf-8') as f:
            json.load(f)
    except json.JSONDecodeError as e:
        error('site.webmanifest: invalid JSON ({})'.format(e))


def check_jsonld_blocks():
    ldjson_pattern = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
    for filename in os.listdir(ROOT):
        if not filename.endswith('.html'):
            continue
        path = os.path.join(ROOT, filename)
        with open(path, encoding='utf-8') as f:
            content = f.read()
        for match in ldjson_pattern.finditer(content):
            try:
                json.loads(match.group(1))
            except json.JSONDecodeError as e:
                error('{}: invalid JSON-LD block ({})'.format(filename, e))


def check_sitemap():
    sitemap_path = os.path.join(ROOT, 'sitemap.xml')
    if not os.path.isfile(sitemap_path):
        return
    try:
        ET.parse(sitemap_path)
    except ET.ParseError as e:
        error('sitemap.xml: invalid XML ({})'.format(e))


check_internal_references()
check_manifest()
check_jsonld_blocks()
check_sitemap()

if errors:
    print('{} problem(s) found:\n'.format(len(errors)))
    for e in errors:
        print(' - ' + e)
    sys.exit(1)
else:
    print('All checks passed.')
