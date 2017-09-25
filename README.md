This [OpenWhisk Project](https://github.com/lionelvillard/openwhisk-deploy) plugin allows the configuration of IBM cloud services.

# Project configuration extension

Contribution point: [service](https://github.com/lionelvillard/openwhisk-deploy/blob/master/docs/format.md#service)

# Credentials

## properties

- `apikey` (string, optional): the Bluemix API key. Default is `$BLUEMIX_API_KEY`
- `org` (string, required): the IBM cloud organization
- `space` (string, required):  IBM cloud space

# `ibm-cloudant`

## properties

- `name` (string, optional): the Cloudant service instance. Default is the package name.
- `key` (string, optional): the Cloudant key name. Default is `Credentials-1`.
- `plan` (string, optional): the Cloudant service plan, e.g. `Lite` or `Standard`. Default is `Lite`. Use `bx service offerings` for more plans.

## example

```yaml
packages:
  wskp-cloudant-binding:
    service: ibm-cloudant
    org: villard@us.ibm.com
    space: wskp-ibmcloud-dev
    name: wskp-cloudant-binding
    key: Credentials-1
```


 