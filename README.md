[![License](https://img.shields.io/github/license/impresscms-dev/install-impresscms-action.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/impresscms-dev/install-impresscms-action.svg)](https://github.com/impresscms-dev/install-impresscms-action/releases)

# Install ImpressCMS

GitHub action to install [ImpressCMS](https://github.com/ImpressCMS/impresscms).

This action is shipped as a pre-bundled `dist/` artifact with runtime dependencies included, so GitHub Actions runners do not need to run `npm install` before using it.

This action auto-detects supported installation strategies. Currently it supports:

- TNG-style installs that use [Composer](https://getcomposer.org) and [Phoenix](https://github.com/lulco/phoenix)
- Legacy branch installs through the classic web installer in `htdocs/install`

## Usage

To use this action in your project, create workflow in your project similar to this code (Note: some parts and arguments
needs to be altered):

```yaml
name: Install ImpressCMS

on:
  push:

jobs:
  install:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:5.6
        env:
          MYSQL_ROOT_PASSWORD: icms
          MYSQL_DATABASE: icms
        ports:
          - 3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3

    steps:
      - name: Checkouting project code...
        uses: actions/checkout@v2
        with:
          repository: ImpressCMS/impresscms
          ref: v2.0.2 # tag, branch (e.g. TNG), or commit SHA
          
      - name: Installing PHP...
        uses: shivammathur/setup-php@2.19.1
        with:
          php-version: 8.1
          extensions: curl, gd, pdo_mysql, json, mbstring, pcre, session
          ini-values: post_max_size=256M
          coverage: none
          tools: composer:v2

      - name: Installing ImpressCMS...
        uses: impresscms-dev/install-impresscms-action@v0.2
        with:
          database_name: icms
          database_user: root
          database_password: icms
          database_port: ${{ job.services.mysql.ports['3306'] }}
```

Choose which ImpressCMS version to install by setting `actions/checkout` `with.ref`:

- Tag: `ref: v2.0.2`
- Branch: `ref: TNG`
- Commit: `ref: 0123abcd4567ef89...`

## Arguments

This action supports such arguments (used in `with` keyword):

| Argument | Required | Default value                | Description       |
|----------|----------|------------------------------|-------------------|
| url  | No       | http://localhost             | Site URL          |
| database_type | No       | pdo.mysql                    | Database type     |
| database_name | No       | icms                         | Database name     |
| database_host | No       | 127.0.0.1                    | Database host     |
| database_user | Yes      |                              | Database user     |
| database_password | No       |                              | Database password |
| database_charset | No       | utf8                         | Charset used for database     |
| database_collation | No       | utf8_general_ci              | Collation used for database     |
| database_prefix | No       | *icms_{run_id}_{run_attemnpt}* | Prefix for each ImpressCMS database table     |
| database_port | No       | 3306                         | Port that is used for database connection     |
| admin_name | No      | icms                         | Administrator name    |
| admin_login | No      | icms                         | Administrator login string  |
| admin_pass | No      | icms                         | Administrator password   |
| admin_email | No      | noreply@impresscms.dev       | Administrator email   |
| language | No      | english                      | Installation language   |
| app_key | No      |                            | Application key. If not specified and your ImpressCMS version supports it, it will be generated automatically   |
| path | No | . | Path where ImpressCMS is located |

## Outputs

This action outputs following data, that can be used in other actions:

| Name | Type                                                                      | Description                                                                                           |
|------|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| app_key | string                                                                    | Generated application key                                                                             |
| detected_impresscms_version | string                                                                    | Detected ImpressCMS version in semver format, useful for debugging strategy/version decisions         |
| uses_composer | boolean                                                                   | Returns if current ImpressCMS version uses [Composer](https://getcomposer.org) for package management |
| uses_phoenix | boolean | Returns if current ImpressCMS version uses [Phoenix](https://github.com/lulco/phoenix) for migrations                                 | 

## How to contribute?

### Integration tests

Repository contains Docker-based integration tests in `tests/integration/install.integration.test.js`.

They install ImpressCMS for each legacy version line from `src/Config/RequirementsInfo.js` plus `tng` branch.

Run manually:

```bash
npm run test:integration
```

Run a single variant:

```bash
INTEGRATION_VARIANT=1.4 npm run test:integration
```

Supported values are `1.0`, `1.2`, `1.3`, `1.4`, `1.5`, `2.0`, `tng`, `all` (default).

There is also manual GitHub workflow: `.github/workflows/integration.yml`.

If you want to add some functionality or fix bugs, you can fork, change and create pull request. If you not sure how
this works, try [interactive GitHub tutorial](https://skills.github.com).

If you found any bug or have some questions,
use [issues tab](https://github.com/impresscms-dev/install-impresscms-action/issues) and write there your questions.
