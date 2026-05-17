using Microsoft.AspNetCore.Mvc;
using MiniMartPOSWeb.Models;

namespace MiniMartPOSWeb.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            // Check if user is authenticated
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                // Get user role from claims
                var userRole = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Role)?.Value;

                // Redirect based on role
                if (userRole == "Admin")
                {
                    return RedirectToAction("Dashboard", "Admin");
                }
                else if (userRole == "Staff")
                {
                    return RedirectToAction("Dashboard", "Staff");
                }
                else
                {
                    // Default to login if role is not recognized
                    return RedirectToAction("Login", "Login");
                }
            }
            else
            {
                // Redirect to login page if not authenticated
                return RedirectToAction("Login", "Login");
            }
        }

        public IActionResult AccessDenied()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = System.Diagnostics.Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}