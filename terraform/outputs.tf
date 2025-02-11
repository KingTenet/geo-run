### outputs.tf ###
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

# Output the ALB DNS name to create A record
output "alb_dns_name" {
  value = aws_lb.main.dns_name
  description = "ALB DNS name. Create a CNAME record pointing your domain to this address."
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "aws_region" {
    description = "AWS Region"
    value = var.aws_region
}

output "certificate_validation_records" {
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
  description = "DNS records needed for certificate validation. Create these in your DNS provider."
}