using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ExpensesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ExpensesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.Expenses
                .OrderByDescending(e => e.ExpenseDate)
                .ToListAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _context.Expenses.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Create([FromBody] Expense expense)
        {
            expense.CreatedDate = DateTime.Now;
            if (expense.ExpenseDate == default) expense.ExpenseDate = DateTime.Now;

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = expense.ExpenseId }, expense);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Update(int id, [FromBody] Expense expense)
        {
            var existing = await _context.Expenses.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Title = expense.Title;
            existing.Amount = expense.Amount;
            existing.ExpenseDate = expense.ExpenseDate == default ? existing.ExpenseDate : expense.ExpenseDate;
            existing.Note = expense.Note;

            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.Expenses.FindAsync(id);
            if (item == null) return NotFound();

            _context.Expenses.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
