First update/add a terraform.tfvars file:

```bash
app_name = "geo-run"
aws_region = "eu-west-2"
ecs_ami_id = "ami-04c812dbb01c77aac"  # Replace with latest ECS-optimized AMI ID for your region
```

Then deploy with:

```bash
terraform init
terraform plan # Review the changes
terraform apply # Deploy the infrastructure
```

Then push the latest container with:

```bash
# Get ECR login credentials
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin $(terraform output -raw ecr_repository_url)

pnpm run containerize {VERSION_TAG}
# Tag the image
docker tag geo-run:latest $(terraform output -raw ecr_repository_url):latest

# Push to ECR
docker push $(terraform output -raw ecr_repository_url):latest
```

To update the application later:

Build and push a new image to ECR
Force a new deployment in ECS:

```bash
aws ecs update-service --cluster geo-run-cluster --service geo-run --force-new-deployment
```
