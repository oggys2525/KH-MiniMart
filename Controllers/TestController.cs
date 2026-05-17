using Microsoft.AspNetCore.Mvc;
using MiniMartPOSWeb.Data;
using System.Linq;

public class TestController : Controller
{
    private readonly ApplicationDbContext _context;

    public TestController(ApplicationDbContext context)
    {
        _context = context;
    }

    public IActionResult Index()
    {
        var users = _context.Users.ToList();
        return View(users);
    }
}