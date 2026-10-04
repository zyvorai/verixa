# Publishing

Verixa is published at [github.com/zyvorai/verixa](https://github.com/zyvorai/verixa), and the
docs site at [zyvorai.github.io/verixa](https://zyvorai.github.io/verixa/).

## Releases

1. Update `CHANGELOG.md` and `version` in `pyproject.toml` and `verixa/__init__.py`.
2. Run `make check` and `node tests/console.cjs`.
3. Tag and push: `git tag -a v0.1.0 -m "v0.1.0" && git push origin v0.1.0`.
4. Create the release: `gh release create v0.1.0 --notes-file <(sed -n '/## \[0.1.0\]/,/## \[/p' CHANGELOG.md)`.

## Docs site

`website/` is a Docusaurus site. Screenshots are served from `docs/ux/` so the README and the
site share one copy. `.github/workflows/pages.yml` builds and deploys it on pushes to `main`
that touch `website/` or `docs/ux/`.

```bash
npm --prefix website ci
npm --prefix website start    # http://localhost:3000/verixa/
npm --prefix website run build
```

Pages was enabled once with:

```bash
gh api repos/zyvorai/verixa/pages -X POST -f build_type=workflow
```

## Forks

`scripts/create-github-repo.sh --public|--private` creates a new repository from a fresh
checkout without Git history. It runs the tests, initializes Git, commits and pushes `main`, and
refuses to overwrite existing history or an existing repository.
