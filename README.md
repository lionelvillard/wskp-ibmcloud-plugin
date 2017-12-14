This [OpenWhisk Project](https://github.com/lionelvillard/openwhisk-project) plugin allows the provisioning of IBM cloud resources.

# Resource type extension

Extends [resource](https://github.com/lionelvillard/openwhisk-deploy/blob/master/docs/format.md#resource) with additional type values:
- [ibm_space](#ibm_space)
- [ibm_service_instance](#ibm_service_instance)

- `org` (string, required): the IBM cloud organization
- `space` (string, required):  IBM cloud space

## `ibm_space`

Create or import an IBM cloud space.

### properties

- `apikey` (string, required): the IBM cloud platform key. Default is `${vars.BLUEMIX_API_KEY}`
- `endpoint` (string, required): the IBM cloud API endpoint. Default is `api.ng.bluemix.net`
- `org` (string, required): The name of the organization to which this space belongs. Defaults is `${vars.BLUEMIX_ORG}`
- `name` (string, required): The descriptive name used to identify a space. By default use the resource key
- `guid` (string, optional): The space guid. Automatically computed.
- `managed` (boolean, required): whether this resource is managed. Default is false

### Managed space example

```yaml
resources:
  space_dev: # also space name
    type: ibm_space
    managed: true
```

## `ibm_service_instance`

### properties

- `service` (string, required): The name of the IBM service. Run `bx service offerings` to get the full list IBM services. See below for service aliases.
- `space` (string, required):  The space where you want to create the service.
- `plan` (string, required): The name of the plan type supported by service. Default is `Lite` (note: not all services support `Lite` plan)
- `tags` (array of string, optional): tags associated with the service instance
- `parameters` (object, optional): Arbitrary parameters to pass to the service broker. The value must be a JSON object.

This plugin recognizes the following service name aliases.

  | alias | actual service name |
  --------|----------------------
  | cloudant | cloudantNoSQLDB |

### Cloudant example

```yaml
resources:
  space_dev:
    type: ibm_space
  cloudant:
    type: ibm_service_instance
    service: cloudant
    space: space_dev
```