[![License](https://img.shields.io/github/license/impresscms-dev/install-impresscms-action.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/release/impresscms-dev/install-impresscms-action.svg)](https://github.com/impresscms-dev/install-impresscms-action/releases)

# Install ImpressCMS

GitHub action to install [ImpressCMS](https://github.com/ImpressCMS/impresscms).

At current moment it works only with ImpressCMS versions that uses [Composer](https://getcomposer.org) and [Phoenix](https://github.com/lulco/phoenix). 

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
          
      - name: Installing PHP...
        uses: shivammathur/setup-php@2.19.1
        with:
          php-version: 8.1
          extensions: curl, gd, pdo_mysql, json, mbstring, pcre, session
          ini-values: post_max_size=256M
          coverage: none
          tools: composer:v2

      - name: Installing ImpressCMS...
        uses: impresscms-dev/install-impresscms-action@v0.1
        with:
          database_name: icms
          database_user: root
          database_password: icms
          database_port: ${{ job.services.mysql.ports['3306'] }}
```

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

## Outputs

This action outputs following data, that can be used in other actions:

| Name | Type                                                                      | Description                                                                                           |
|------|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| app_key | string                                                                    | Generated application key                                                                             |
| uses_composer | boolean                                                                   | Returns if current ImpressCMS version uses [Composer](https://getcomposer.org) for package management |
| uses_phoenix | boolean | Returns if current ImpressCMS version uses [Phoenix](https://github.com/lulco/phoenix) for migrations                                 | 

## How to contribute?

If you want to add some functionality or fix bugs, you can fork, change and create pull request. If you not sure how
this works, try [interactive GitHub tutorial](https://skills.github.com).

If you found any bug or have some questions,
use [issues tab](https://github.com/impresscms-dev/install-impresscms-action/issues) and write there your questions.
