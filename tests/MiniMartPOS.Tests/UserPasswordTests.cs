using MiniMartPOSWeb.Models;
using Xunit;

namespace MiniMartPOS.Tests;

public class UserPasswordTests
{
    [Fact]
    public void SetPassword_ShouldHashAndVerify()
    {
        var user = new User
        {
            Username = "tester",
            RoleId = 1
        };

        user.SetPassword("Pass@123");

        Assert.False(string.IsNullOrWhiteSpace(user.PasswordHash));
        Assert.NotEqual("Pass@123", user.PasswordHash);
        Assert.True(user.VerifyPassword("Pass@123"));
        Assert.False(user.VerifyPassword("WrongPass"));
    }
}
