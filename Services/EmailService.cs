using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace MiniMartPOSWeb.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string htmlBody);
        Task SendReceiptAsync(string customerEmail, string receiptHtml, int saleId);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string htmlBody)
        {
            try
            {
                var smtpServer = _configuration["Email:SmtpServer"];
                var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
                var senderEmail = _configuration["Email:SenderEmail"];
                var senderPassword = _configuration["Email:SenderPassword"];
                var senderName = _configuration["Email:SenderName"];

                if (string.IsNullOrWhiteSpace(smtpServer) || string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(senderPassword))
                {
                    throw new InvalidOperationException("Email settings are not configured. Please set Email:SmtpServer, Email:SenderEmail, and Email:SenderPassword.");
                }

                using (var client = new SmtpClient(smtpServer, smtpPort))
                {
                    client.EnableSsl = true;
                    client.Credentials = new NetworkCredential(senderEmail, senderPassword);

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(senderEmail, senderName ?? "KH Mart POS"),
                        Subject = subject,
                        Body = htmlBody,
                        IsBodyHtml = true
                    };

                    mailMessage.To.Add(to);

                    await client.SendMailAsync(mailMessage);
                    _logger.LogInformation($"Email sent successfully to {to}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending email to {to}: {ex.Message}");
                throw;
            }
        }

        public async Task SendReceiptAsync(string customerEmail, string receiptHtml, int saleId)
        {
            if (string.IsNullOrWhiteSpace(customerEmail))
                return;

            var subject = $"Receipt #{saleId} - KH Mart";

            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: Arial, sans-serif; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #047857; color: white; padding: 20px; text-align: center; }}
        .receipt {{ border: 1px solid #ddd; padding: 20px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>KH MART</h1>
            <p>Thank you for your purchase!</p>
        </div>
        <div class='receipt'>
            {receiptHtml}
        </div>
        <div class='footer'>
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; 2026 KH Mart. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";

            await SendEmailAsync(customerEmail, subject, htmlBody);
        }
    }
}
