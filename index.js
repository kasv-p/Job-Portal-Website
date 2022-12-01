var express = require("express");
const path = require("path");
const router = express.Router();
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

app.use(session({ secret: "key", saveUninitialized: true, resave: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(__dirname + "/public"));
var user_count = 1;
const port = process.env.PORT || 3001;

app.get("/", (req, res) => {
  if (req.session.userType) {
    if (req.session.userType == "Admin") {
      if (!req.session.companyid) {
        res.render("home.ejs");
      } else {
        res.redirect("/companyDashboard");
      }
    } else {
      if (!req.session.userid) {
        res.render("home.ejs");
      } else {
        res.redirect("/userDashboard");
      }
    }
  } else {
    res.render("home.ejs");
  }
});

app.get("/adminLogin", (req, res) => {
  req.session.userType = "Admin";
  req.session.unique_id = "A" + ++user_count;
  res.render("login.ejs", {
    user_type: req.session.userType,
  });
});

app.get("/userLogin", (req, res) => {
  req.session.userType = "User";
  req.session.unique_id = "U" + ++user_count;
  res.render("login.ejs", {
    user_type: req.session.userType,
  });
});

app.post("/login", (req, res) => {
  var reqData = req.body;

  var mysql = require("mysql");
  var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "jobportal",
  });

  connection.connect(function (err) {
    if (err) {
      console.error("error connecting: " + err.stack);
      return;
    }
  });

  if (req.session.userType == "User") {
    var query =
      "SELECT user_id, password FROM jobseeker_user_account WHERE user_id = ? and password = ?;";
    connection.query(
      query,
      [reqData["id"], reqData["pass"]],
      function (error, results) {
        if (error) throw error;

        if (results.length == 0) {
          res.status(200).send({ stat: "wrong" });
        } else {
          req.session.userid = results[0]["user_id"];
          res.status(200).send({ stat: "right", usertype: "User" });
        }
      }
    );
  } else {
    // company
    var query =
      "SELECT company_id, password FROM company_user_account WHERE company_id = ? and password = ?;";
    connection.query(
      query,
      [reqData["id"], reqData["pass"]],
      function (error, results) {
        if (error) {
          throw error;
        }

        if (results.length == 0) {
          res.status(200).send({ stat: "wrong" });
        } else {
          req.session.companyid = results[0]["company_id"];
          var query = "SELECT * FROM company WHERE company_id = ?;";
          connection.query(
            query,
            [req.session.companyid],
            function (error, results) {
              if (error) {
                throw error;
              } else {
                req.session.compname = results[0]["company_name"];

                res.status(200).send({ stat: "right", usertype: "Admin" });
              }
            }
          );
        }
      }
    );
  }
});

app.get("/register", (req, res) => {
  var mysql = require("mysql");
  if (req.session.userType == "User") {
    var connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jobportal",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("error connecting: " + err.stack);
        return;
      }
    });

    connection.query(
      "Select skill_name from skill_set",
      function (error, results) {
        if (error) throw error;
        skillset = [];
        for (i = 0; i < results.length; i++) {
          skillset.push(results[i]["skill_name"]);
        }
        req.session.skills_names = skillset;
        res.render("user-registration.ejs", {
          skills: skillset,
        });
      }
    );
  } else {
    res.render("company-registration.ejs");
  }
});

app.post("/companyFormSubmit", (req, res) => {
  var reqData = req.body;

  var mysql = require("mysql");
  var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "jobportal",
  });

  connection.connect(function (err) {
    if (err) {
      console.error("error connecting: " + err.stack);
      return;
    }
  });
  var query =
    "SELECT company_id FROM company_user_account WHERE company_id = ?;";
  connection.query(query, [reqData["compid"]], function (error, results) {
    if (error) {
      throw error;
    }

    if (results.length == 0) {
      connection.query(
        "INSERT into company_user_account VALUES(?,?,?) ",
        [reqData["compid"], reqData["comppwd"], reqData["compmail"]],
        function (error, results) {
          if (error) throw error;
        }
      );
      connection.query(
        "INSERT into company VALUES(?,?,?,?,?) ",
        [
          reqData["compid"],
          reqData["compname"],
          reqData["compdesc"],
          reqData["compbus"],
          reqData["compurl"],
        ],
        function (error, results) {
          if (error) throw error;
        }
      );
      connection.end();
      res.status(200).send({ stat: "right" });
    } else {
      res.status(200).send({ stat: "exist" });
    }
  });
});
app.post("/userFormSubmit", (req, res) => {
  var reqData = req.body;
  var mysql = require("mysql");
  var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "jobportal",
  });

  connection.connect(function (err) {
    if (err) {
      console.error("error connecting: " + err.stack);
      return;
    }

    query = "SELECT user_id from jobseeker_user_account where user_id = ?;";
    connection.query(query, [reqData["user_id"]], function (error, results) {
      if (error) {
        res.status(200).send({ stat: "exist" });
      }
      if (results.length == 0) {
        query = "INSERT into jobseeker_user_account VALUES(?,?,?);";
        connection.query(
          query,
          [reqData["user_id"], reqData["password"], reqData["user_email"]],
          function (error, results) {
            if (error) {
              throw error;
            }
          }
        );

        query = "INSERT into seeker_profile VALUES(?,?,?,?,?);";
        connection.query(
          query,
          [
            reqData["user_id"],
            reqData["fname"],
            reqData["lname"],
            reqData["gender"],
            reqData["phone_no"],
          ],
          function (error, results) {
            if (error) {
              throw error;
            }
          }
        );

        var i = 7;
        var x = 0;
        while (1) {
          ed = Object.keys(reqData).slice(i, i + 6);

          values = [reqData["user_id"]].concat(
            Object.values(reqData).slice(i, i + 6)
          );
          if (ed[0].substring(0, 3) == "edu") {
            query = "INSERT into education_details VALUES(?,?,?,?,?,?,?);";
            connection.query(query, values, function (error, results) {
              if (error) {
                throw error;
              }
            });
          } else {
            x = i - 5;
            break;
          }
          i = i + 6;
        }

        i = x;
        while (i < Object.values(reqData).length - 1) {
          values = [reqData["user_id"]].concat(
            Object.values(reqData).slice(i, i + 5)
          );

          query = "INSERT into experience_details VALUES(?,?,?,?,?,?);";
          connection.query(query, values, function (error, results) {
            if (error) {
              throw error;
            }
          });
          i = i + 5;
        }

        if (typeof reqData["mulselect"] == "object") {
          for (i = 0; i < reqData["mulselect"].length; i = i + 1) {
            query = "INSERT into seeker_skill_set VALUES(?,?);";
            connection.query(
              query,
              [reqData["user_id"], reqData["mulselect"][i]],
              function (error, results) {
                if (error) {
                  throw error;
                }
              }
            );
          }
        } else if (typeof reqData["mulselect"] == "string") {
          query = "INSERT into seeker_skill_set VALUES(?,?);";
          connection.query(
            query,
            [reqData["user_id"], reqData["mulselect"]],
            function (error, results) {
              if (error) {
                throw error;
              }
            }
          );
        }
      } else {
        res.render("user-registration.ejs", {
          skills: req.session.skills_names,
        });
      }
    });

    res.status(200).send({ stat: "done" });
  });
});
app.get("/userDashboard", (req, res) => {
  if (req.session.userType == "Admin") {
    res.redirect("/");
  } else {
    res.render("user-dashboard.ejs", {
      user_id: req.session.userid,
    });
  }
});

app.get("/userProfile", (req, res) => {
  if (!req.session.userid || req.session.userType == "Admin") {
    res.redirect("/");
  } else {
    var mysql = require("mysql");
    var connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jobportal",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("error connecting: " + err.stack);
        return;
      }

      var query =
        "SELECT * FROM jobseeker_user_account natural join seeker_profile where user_id = ?;";
      connection.query(query, [req.session.userid], function (error, results1) {
        if (error) {
          throw error;
        }

        var query = "SELECT * FROM education_details where user_id = ?;";
        connection.query(
          query,
          [req.session.userid],
          function (error, results2) {
            if (error) {
              throw error;
            }

            var query = "SELECT * FROM experience_details where user_id = ?;";
            connection.query(
              query,
              [req.session.userid],
              function (error, results3) {
                if (error) {
                  throw error;
                }

                var query =
                  "SELECT skill_name FROM seeker_skill_set where user_id = ?;";
                connection.query(
                  query,
                  [req.session.userid],
                  function (error, results4) {
                    if (error) {
                      throw error;
                    }

                    res.render("profile.ejs", {
                      results: results1,
                      education_details: results2,
                      experience_details: results3,
                      skills: results4,
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  }
});
app.get("/userJobListing", (req, res) => {
  if (!req.session.userid || req.session.userType == "Admin") {
    res.redirect("/");
  } else {
    var mysql = require("mysql");
    var connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jobportal",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("error connecting: " + err.stack);
        return;
      }

      var query = "SELECT * FROM job_post natural join company;";
      connection.query(query, function (error, results) {
        if (error) {
          throw error;
        } else {
          res.render("job-listing.ejs", { results: results });
        }
      });
    });
  }
});

app.get("/userJobDetails", (req, res) => {
  if (!req.session.userid || req.session.userType == "Admin") {
    res.redirect("/");
  } else {
    job_id = req.query.id;
    comp_id = req.query.comp;

    var mysql = require("mysql");
    var connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jobportal",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("error connecting: " + err.stack);
        return;
      }

      var query =
        "SELECT * FROM job_post natural join company natural join company_user_account WHERE company_id = ? and job_post_id = ?;";
      connection.query(query, [comp_id, job_id], function (error, results) {
        if (error) {
          throw error;
        } else {
          var query =
            "select * from job_post_activity where company_id=? and user_id=? and job_post_id=? ";
          connection.query(
            query,
            [comp_id, req.session.userid, job_id],
            function (error, results2) {
              if (error) {
                throw error;
              }

              if (results2.length > 0) {
                text = "Applied";

                res.render("job-details.ejs", {
                  results: results,
                  text: text,
                  alert: "hhh",
                });
              } else {
                var query =
                  "select * from job_post where company_id=? and job_post_id=? ";
                connection.query(
                  query,
                  [comp_id, job_id],
                  function (error, results3) {
                    if (error) {
                      throw error;
                    }
                    // var array = results3[0].end_date.split("-");
                    // var d = array[2] + "-" + array[1] + "-" + array[0];
                    var n = new Date(results3[0].end_date);
                    var t = new Date();
                    if (n.getTime() >= t.getTime()) {
                      text = "Apply";

                      res.render("job-details.ejs", {
                        results: results,
                        text: text,
                        alert: "hhh",
                      });
                    } else {
                      text = "Applications Closed";

                      res.render("job-details.ejs", {
                        results: results,
                        text: text,
                        alert: "hhh",
                      });
                    }
                  }
                );
              }
            }
          );
        }
      });
    });
  }
});

app.get("/companyDashboard", (req, res) => {
  if (!req.session.companyid || req.session.userType != "Admin") {
    res.redirect("/");
  } else {
    res.render("company-dashboard.ejs", {
      comp_id: req.session.companyid,
    });
  }
});

app.get("/companyJobPostings", (req, res) => {
  if (!req.session.companyid || req.session.userType != "Admin") {
    res.redirect("/");
  } else {
    var companyID = req.session.companyid;

    var mysql = require("mysql");
    var connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jobportal",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("error connecting: " + err.stack);
        return;
      }
    });
    var query = "SELECT * FROM job_post WHERE company_id = ?;";
    connection.query(query, [companyID], function (error, results) {
      if (error) {
        throw error;
      } else {
        res.render("job-postings.ejs", {
          all_postings: results,
        });
      }
    });
  }
});

app.get("/apply", (req, res) => {
  job_id = req.query.jobid;
  com_id = req.query.compid;

  var mysql = require("mysql");
  var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "jobportal",
  });

  connection.connect(function (err) {
    if (err) {
      console.error("error connecting: " + err.stack);
      return;
    }
  });
  const d = new Date();
  str = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  var query = "INSERT into job_post_activity values(?,?,?,?)";
  connection.query(
    query,
    [req.session.userid, job_id, com_id, str],
    function (error, results) {
      if (error) {
        throw error;
      }
    }
  );

  res.render("user-dashboard.ejs", { user_id: req.session.userid });
});

app.get("/companyJobPostingsApplied", (req, res) => {
  if (!req.session.companyid || req.session.userType != "Admin") {
    res.redirect("/");
  } else {
    var jobid = req.query.id;
    var companyID = req.session.companyid;

    var mysql = require("mysql");
    var connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jobportal",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("error connecting: " + err.stack);
        return;
      }
    });
    let applicantsdict = {};
    var query =
      "SELECT * FROM job_post_activity natural join seeker_profile where job_post_id=?  and company_id=?;";
    connection.query(
      query,
      [jobid, req.session.companyid],
      function (err, results) {
        if (err) {
          console.error("error connecting: " + err.stack);
          return;
        } else {
          if (results.length == 0) {
            res.render("job-posting-applied.ejs", { details: 0 });
          }
          applicantsdict["seeker_details"] = results;
          applicantsdict["education_details"] = [];
          applicantsdict["exp_details"] = [];
          size = results.length;
          for (i = 0; i < size; i++) {
            let iter = i;
            let vsize = size;
            var query1 = "SELECT * FROM education_details where user_id=?;";
            var query2 = "SELECT * FROM experience_details where user_id=?;";

            temp = connection.query(
              query1,
              [results[i]["user_id"]],
              function (err, edresults) {
                if (err) throw err;
                else {
                  var data = JSON.parse(JSON.stringify(edresults));

                  applicantsdict["education_details"].push(data);
                }
              }
            );

            temp = connection.query(
              query2,
              [results[i]["user_id"]],
              function (err, exresults) {
                if (err) throw err;
                else {
                  var data = JSON.parse(JSON.stringify(exresults));

                  applicantsdict["exp_details"].push(data);
                }

                if (iter == vsize - 1) {
                  res.render("job-posting-applied.ejs", {
                    details: applicantsdict,
                  });
                }
                return true;
              }
            );
          }
        }
      }
    );
  }
});
app.get("/companyJobPostNew", (req, res) => {
  if (!req.session.companyid || req.session.userType != "Admin") {
    res.redirect("/");
  } else {
    res.render("company-job-post.ejs");
  }
});
app.post("/companyJobPostNewFormSubmit", (req, res) => {
  if (req.session.userType != "Admin") {
    res.redirect("/");
  } else {
    var reqData = req.body;

    var mysql = require("mysql");
    var connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "jobportal",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("error connecting: " + err.stack);
        return;
      }

      query =
        "SELECT job_post_id from job_post where job_post_id = ? and company_id = ?;";
      connection.query(
        query,
        [reqData["job_post_id"], req.session.companyid],
        function (error, results) {
          if (error) {
            throw error;
          }
          if (results.length == 0) {
            query = "INSERT into job_post VALUES(?,?,?,?,?,?,?);";
            connection.query(
              query,
              [
                reqData["job_post_id"],
                req.session.companyid,
                reqData["job_type"],
                reqData["created_date"],
                reqData["end_date"],
                reqData["job_description"],
                reqData["job_location"],
              ],
              function (error, results) {
                if (error) {
                  res.status(200).send({ stat: "exist" });
                } else {
                  res.status(200).send({ stat: "right" });
                }
              }
            );
            connection.end();
          } else {
            res.status(200).send({ stat: "exist" });
          }
        }
      );
    });
  }
});
app.get("/companyRegistration", (req, res) => {
  res.render("company-registration.ejs");
});
app.get("/logout", (req, res) => {
  // req.session.isLoggedin = false;
  req.session.destroy((err) => {
    if (err) {
      return console.log(err);
    }
    res.redirect("/");
  });
});
app.listen(port, () => console.log(port));
