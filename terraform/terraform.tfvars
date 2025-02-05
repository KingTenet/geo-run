app_name = "geo-run"
aws_region = "eu-west-2"
ecs_ami_id = "ami-04c812dbb01c77aac"  # Replace with latest ECS-optimized AMI ID for your region
container_environment_variables = [
  {
    name  = "CLIENT_PUBLIC_KEY"
    value = "zyyojSKweVPkMLim6m/efPbHaB18QUa8GJiYWfTlIu8="
  },
  {
    name  = "DAEMON_PUBLIC_KEY"
    value = "WDzUqts3kDr2WSCl8F9ZOxm2CqZAUrBUqEprJCqOvug="
  }
]
domain_name = "geo.felixmorley.dev"