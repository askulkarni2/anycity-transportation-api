# AnyCity API Demo

## Deployment

```sh
$ npm install

$ aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

$ cdk deploy
```