app_name = "geo-run"
aws_region = "eu-west-2"
ecs_ami_id = "ami-04c812dbb01c77aac"  # Replace with latest ECS-optimized AMI ID for your region
container_environment_variables = [
  {
    name  = "CLIENT_PUBLIC_KEY"
    value = ""
  }
]